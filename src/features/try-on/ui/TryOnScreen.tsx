/**
 * TryOnScreen — live AR try-on of one product.
 *
 * The rendering is the M-Optic website's try-on, ported unchanged and running
 * in a WebView (see /tryon-engine): MediaPipe Face Landmarker for the head
 * pose, three.js for the frame, the same calibration numbers. Everything the
 * wearer reads or taps is native, here.
 *
 *   PermissionGate → camera rationale / blocked (Open Settings)
 *   WebView engine → camera + tracking + glasses (reports state via messages)
 *   overlays       → status, "position your face", face-shape badge
 *   bottom panel   → name, price, colour switcher, shutter, Telegram enquiry
 *   review card    → the captured photo card, Retake / Share
 *
 * The camera and GL context are released whenever the screen loses focus or
 * the app goes to the background: the WebView is unmounted, which stops the
 * stream and frees the context.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import AppText from '../../../components/AppText';
import PriceTag from '../../../components/ui/PriceTag';
import { BorderRadius, Colors, FontSize, Spacing } from '../../../theme';
import { useProductDetail } from '../../../hook/useProductDetail';
import { colorOptions, galleryImages } from '../../../utils/productMedia';
import { variationPricing } from '../../../utils/salePrice';
import { buildTelegramInquiry, telegramInquiryUrl } from '../../../utils/telegramInquiry';
import { posthog } from '../../../config/posthog';
import type { Product, ProductVariation } from '../../../types/glasses';
import type { RootStackParamList } from '../../../types/navigation';
import { buildProductVTOFrames } from '../core/productCalibration';
import type { VTOFrame } from '../core/frames';
import { FRAME_RECOMMENDATIONS, type FaceShape } from '../core/faceShapeTypes';
import { buildEngineHtml, VTO_ASSET_ORIGIN } from '../engine/engineHtml';
import { loadGlb } from '../glbDownload';
import PermissionGate, { useCameraPermission } from './PermissionGate';
import FrameSwitcher, { type SwitcherOption } from './FrameSwitcher';
import CaptureReviewCard, { type CapturedPhoto } from './CaptureReviewCard';

/** One colourway that can be tried on: its own GLB, calibration and price. */
interface TryOnOption extends SwitcherOption {
  variation: ProductVariation | null;
  frame: VTOFrame;
}

type EngineStatus = 'loading' | 'ready' | 'denied' | 'error' | 'no-webgl';

/** Built once per app run; the engine bundle is ~1.3 MB of inlined script. */
let engineHtml: string | null = null;
const getEngineHtml = () => (engineHtml ??= buildEngineHtml());

/** Colourways with a try-on GLB, in the product's own order. */
function tryOnOptions(product: Product): TryOnOption[] {
  const colours = colorOptions(product);
  if (colours.length > 0) {
    return colours.flatMap(c => {
      const [frame] = buildProductVTOFrames(c.variation, c.variation.assets, product);
      return frame
        ? [{ key: String(c.variation.id), label: c.label, hex: c.hex, variation: c.variation, frame }]
        : [];
    });
  }
  const [frame] = buildProductVTOFrames(product, product.assets);
  return frame
    ? [{ key: String(product.id), label: product.color?.name ?? '', hex: product.color?.hex_code ?? null, variation: null, frame }]
    : [];
}

const TryOnScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'TryOn'>>();
  const { productId, variationId } = route.params;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const { product, loading: productLoading, error: productError } = useProductDetail(productId);
  const permission = useCameraPermission();

  // ── Lifecycle: no camera unless focused and in the foreground ──────────────
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);
  const engineMounted = isFocused && appActive && permission.state === 'granted';

  // ── Options + selection ────────────────────────────────────────────────────
  const options = useMemo(() => (product ? tryOnOptions(product) : []), [product]);
  const [selectedKey, setSelectedKey] = useState<string | null>(variationId ?? null);
  const selected = useMemo(
    () => options.find(o => o.key === selectedKey) ?? options[0] ?? null,
    [options, selectedKey],
  );

  // ── Engine state (reported by the WebView) ─────────────────────────────────
  const webRef = useRef<WebView>(null);
  const [webReady, setWebReady] = useState(false);
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('loading');
  const [faceDetected, setFaceDetected] = useState<boolean | null>(null);
  const [glassesLoading, setGlassesLoading] = useState(false);
  const [glbError, setGlbError] = useState(false);
  const [faceShape, setFaceShape] = useState<FaceShape | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [capturing, setCapturing] = useState(false);

  // Time from opening the screen to the first fitted frame (spec: < 2.5 s
  // with the model cached). Logged in development and sent to analytics.
  const openedAt = useRef(Date.now());
  const firstFitLogged = useRef(false);

  // A fresh WebView (after blur/background) starts from scratch.
  useEffect(() => {
    if (!engineMounted) {
      setWebReady(false);
      setEngineStatus('loading');
      setFaceDetected(null);
      setGlassesLoading(false);
    }
  }, [engineMounted]);

  // ── Download the selected colourway's GLB and hand it to the engine ────────
  const frameDataRef = useRef<{ key: string; data: string } | null>(null);
  const sendFrame = useCallback(() => {
    const current = frameDataRef.current;
    if (!webReady || !selected || !current || current.key !== selected.key) return;
    const payload = JSON.stringify({ ...selected.frame, glbPath: current.data });
    webRef.current?.injectJavaScript(`window.__vto && window.__vto.setFrame(${payload}); true;`);
  }, [webReady, selected]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setGlbError(false);
    setDownloading(true);
    setDownloadProgress(null);
    loadGlb(selected.frame.glbPath, p => !cancelled && setDownloadProgress(p))
      .then(data => {
        if (cancelled) return;
        frameDataRef.current = { key: selected.key, data };
        setDownloading(false);
        sendFrame();
      })
      .catch(err => {
        if (cancelled) return;
        console.warn('[TryOn] GLB download failed:', err?.message);
        setDownloading(false);
        setGlbError(true);
      });
    return () => {
      cancelled = true;
    };
    // sendFrame is re-run below when the WebView becomes ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.key]);

  useEffect(() => {
    sendFrame();
  }, [sendFrame]);

  // ── Messages from the engine ───────────────────────────────────────────────
  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      let msg: any;
      try {
        msg = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      switch (msg.type) {
        case 'status':
          setEngineStatus(msg.status);
          if (msg.status === 'denied') permission.markBlocked();
          if (msg.status === 'error' || msg.status === 'no-webgl') {
            console.warn('[TryOn] engine failed to start:', msg.message);
            posthog?.capture('try_on_start_failed', { status: msg.status, product_id: productId });
          }
          break;
        case 'face':
          setFaceDetected(msg.detected);
          break;
        case 'glasses':
          setGlassesLoading(msg.loading);
          break;
        case 'glbError':
          console.warn('[TryOn] GLB failed in engine:', msg.reason, msg.message);
          setGlbError(true);
          break;
        case 'faceShape':
          setFaceShape(msg.shape);
          break;
        case 'firstFit':
          if (!firstFitLogged.current) {
            firstFitLogged.current = true;
            const ms = Date.now() - openedAt.current;
            if (__DEV__) console.log(`[TryOn] first fitted frame after ${ms} ms`);
            posthog?.capture('try_on_first_fit', { ms, product_id: productId });
          }
          break;
        case 'stats':
          if (__DEV__) {
            console.log(
              `[TryOn] delegate=${msg.delegate} inference=${msg.inferenceMs}ms ` +
                `detectionFps=${msg.detectionFps} renderFps=${msg.renderFps}`,
            );
          }
          break;
        case 'photo':
          setCapturing(false);
          setPhoto({ dataUrl: msg.dataUrl, width: msg.width, height: msg.height });
          posthog?.capture('try_on_photo_taken', { product_id: productId });
          break;
        case 'photoError':
          setCapturing(false);
          Alert.alert(t('Error'), t('TryOn.photo_failed'));
          break;
      }
    },
    [permission, productId, t],
  );

  // ── Actions ────────────────────────────────────────────────────────────────
  const close = () => navigation.goBack();

  const colourCaption = (o: TryOnOption | null) =>
    o?.label ? `${t('TryOn.photo_frame_color')}: ${o.label}` : null;

  const takePhoto = () => {
    if (capturing) return;
    setCapturing(true);
    const caption = JSON.stringify({
      title: product?.name ?? product?.item_name ?? null,
      subtitle: colourCaption(selected),
    });
    webRef.current?.injectJavaScript(`window.__vto && window.__vto.capture(${caption}); true;`);
  };

  const openTelegram = async () => {
    if (!product) return;
    const v = selected?.variation;
    const message = buildTelegramInquiry({
      name: product.name ?? product.item_name ?? '',
      brand: product.brand?.name,
      colourLabel: selected?.label || null,
      colourCode: v?.color_code,
      itemCode: v?.item_code || product.item_code,
      photo: galleryImages(v)[0] ?? galleryImages(product)[0] ?? product.image,
    });
    try {
      await Linking.openURL(telegramInquiryUrl(message));
      posthog?.capture('product_inquiry_started', {
        product_id: String(product.id),
        has_selected_color: !!v,
        source: 'try_on',
      });
    } catch {
      Alert.alert(t('Error'), t('FailedToOpenTelegramLink'));
    }
  };

  // ── Status line ────────────────────────────────────────────────────────────
  let statusText: string | null = null;
  let statusBusy = false;
  if (engineMounted) {
    if (engineStatus === 'loading') {
      statusText = t('TryOn.starting_camera');
      statusBusy = true;
    } else if (engineStatus === 'ready') {
      if (glbError) statusText = t('TryOn.model_error');
      else if (downloading) {
        statusText =
          downloadProgress != null
            ? t('TryOn.loading_model', { percent: Math.round(downloadProgress * 100) })
            : t('TryOn.loading_model_plain');
        statusBusy = true;
      } else if (glassesLoading) {
        statusText = t('TryOn.loading_model_plain');
        statusBusy = true;
      } else if (faceDetected === false || faceDetected === null) {
        statusText = t('TryOn.position_face');
      }
    }
  }
  const engineFailed = engineStatus === 'error' || engineStatus === 'no-webgl';

  const pricing = product ? variationPricing(product, selected?.variation ?? null) : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {engineMounted && !engineFailed && (
        <WebView
          ref={webRef}
          style={StyleSheet.absoluteFill}
          source={{ html: getEngineHtml(), baseUrl: VTO_ASSET_ORIGIN }}
          originWhitelist={['*']}
          javaScriptEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          onLoadEnd={() => setWebReady(true)}
          onMessage={onMessage}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          setSupportMultipleWindows={false}
          webviewDebuggingEnabled={__DEV__}
        />
      )}

      {permission.state !== 'granted' && (
        <PermissionGate
          state={permission.state}
          onAllow={permission.request}
          onClose={close}
        />
      )}

      {permission.state === 'granted' && engineFailed && (
        <View style={styles.centerMessage}>
          <AppText style={styles.messageTitle}>
            {engineStatus === 'no-webgl' ? t('TryOn.no_webgl') : t('TryOn.start_error_title')}
          </AppText>
          {engineStatus === 'error' && (
            <>
              <AppText style={styles.messageBody}>{t('TryOn.start_error_body')}</AppText>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => setEngineStatus('loading')}
                activeOpacity={0.85}
              >
                <AppText style={styles.retryText}>{t('TryOn.try_again')}</AppText>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {permission.state === 'granted' && !productLoading && product && options.length === 0 && (
        <View style={styles.centerMessage}>
          <AppText style={styles.messageTitle}>{t('TryOn.no_model')}</AppText>
        </View>
      )}

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={close}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('Close')}
        >
          <Ionicons name="close" size={22} color={Colors.black} />
        </TouchableOpacity>
      </View>

      {/* Status pill */}
      {!!statusText && (
        <View style={styles.statusWrap} pointerEvents="none">
          <View style={styles.statusPill}>
            {statusBusy && <ActivityIndicator size="small" color={Colors.white} />}
            <AppText style={styles.statusText}>{statusText}</AppText>
          </View>
        </View>
      )}

      {(productLoading || (!product && !productError)) && permission.state === 'granted' && (
        <View style={styles.statusWrap} pointerEvents="none">
          <ActivityIndicator color={Colors.white} />
        </View>
      )}

      {/* Bottom: face shape, shutter, product panel */}
      {permission.state === 'granted' && product && options.length > 0 && (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.sm }]} pointerEvents="box-none">
          {faceShape && engineStatus === 'ready' && (
            <View style={styles.faceBadge}>
              <AppText style={styles.faceKicker}>{t('TryOn.face_shape_title')}</AppText>
              <AppText style={styles.faceShape}>{t(`TryOn.face_shape_${faceShape}`)}</AppText>
              <AppText style={styles.faceSuits}>
                {t('TryOn.face_shape_suits')}:{' '}
                {FRAME_RECOMMENDATIONS[faceShape].map(k => t(`TryOn.frame_shape_${k}`)).join(' · ')}
              </AppText>
              <AppText style={styles.faceNote}>{t('TryOn.face_shape_note')}</AppText>
            </View>
          )}

          <TouchableOpacity
            style={[styles.shutter, (engineStatus !== 'ready' || !faceDetected) && styles.shutterDisabled]}
            onPress={takePhoto}
            disabled={engineStatus !== 'ready' || capturing}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('TryOn.photo_take')}
          >
            {capturing ? (
              <ActivityIndicator color={Colors.black} />
            ) : (
              <Ionicons name="camera" size={26} color={Colors.black} />
            )}
          </TouchableOpacity>

          <View style={styles.panel}>
            <View style={styles.nameRow}>
              <AppText style={styles.name} numberOfLines={1}>
                {product.name ?? product.item_name}
              </AppText>
              {pricing && <PriceTag pricing={pricing} priceStyle={styles.price} />}
            </View>

            {options.length > 1 && (
              <FrameSwitcher
                options={options}
                selectedKey={selected?.key ?? null}
                onSelect={key => {
                  setSelectedKey(key);
                  posthog?.capture('try_on_colour_switched', { product_id: productId });
                }}
              />
            )}

            <TouchableOpacity style={styles.cta} onPress={openTelegram} activeOpacity={0.85}>
              <Ionicons name="paper-plane-outline" size={18} color={Colors.white} />
              <AppText style={styles.ctaText}>{t('TryOn.ask_telegram')}</AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <CaptureReviewCard photo={photo} productId={productId} onClose={() => setPhoto(null)} />
    </View>
  );
};

export default TryOnScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '80%',
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  statusText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.white, flexShrink: 1 },
  centerMessage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    backgroundColor: '#0d0d0f',
  },
  messageTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.white, textAlign: 'center' },
  messageBody: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  retryBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    height: 46,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.black },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  faceBadge: {
    alignSelf: 'flex-start',
    maxWidth: '70%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  faceKicker: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.65)',
  },
  faceShape: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
  faceSuits: { marginTop: 2, fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  faceNote: { marginTop: 2, fontSize: 10, color: 'rgba(255,255,255,0.55)' },
  shutter: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: { opacity: 0.55 },
  panel: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 20,
    backgroundColor: Colors.white,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  name: { flex: 1, fontSize: FontSize.md, fontWeight: '800', color: Colors.black },
  price: { fontSize: FontSize.md, fontWeight: '800', color: Colors.primary },
  cta: {
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.white },
});
