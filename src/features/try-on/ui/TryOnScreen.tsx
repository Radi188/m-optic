/**
 * TryOnScreen — live AR try-on of one product, fully native.
 *
 *   PermissionGate   camera rationale / blocked (Open Settings)
 *   mirror wrapper   ┌ VisionCamera preview (front, unmirrored, cover)
 *   (scaleX -1)      └ TryOnCanvas (three.js on expo-gl, transparent)
 *   overlays         status, "position your face", face-shape badge
 *   bottom panel     name, price, colour switcher, shutter, Telegram enquiry
 *   review card      the composed photo card, Save / Share
 *
 * MediaPipe analyses the raw (unmirrored) frames on the camera thread and the
 * glasses are rendered in that same space; the preview and the GL view are
 * then mirrored together, once, by the wrapper — exactly like the website's
 * scaleX(-1) cover-box.
 *
 * Camera, GL context and landmarker are released whenever the screen loses
 * focus or the app goes to the background (everything below is unmounted).
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
  type LayoutChangeEvent,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Camera, CommonResolutions, usePhotoOutput } from 'react-native-vision-camera';
import { Directory, Paths } from 'expo-file-system';
import { composePhotoCard } from 'react-native-moptic-vto';

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
import { useVtoStore } from '../store';
import { useFaceTracking } from '../useFaceTracking';
import { loadGlb, prefetchGlb, type GLTF } from '../render/glbLoader';
import TryOnCanvas, { coverGeometry, type TryOnCanvasHandle } from '../render/TryOnCanvas';
import PermissionGate, { useCameraPermission } from './PermissionGate';
import FrameSwitcher, { type SwitcherOption } from './FrameSwitcher';
import CaptureReviewCard, { type CapturedPhoto } from './CaptureReviewCard';

/** One colourway that can be tried on: its own GLB, calibration and price. */
interface TryOnOption extends SwitcherOption {
  variation: ProductVariation | null;
  frame: VTOFrame;
}

type GlbState =
  | { status: 'idle' }
  | { status: 'downloading'; progress: number | null }
  | { status: 'parsing' }
  | { status: 'ready'; gltf: GLTF; key: string }
  | { status: 'error' };

const PHOTO_DIR = 'vto-photos';

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
    ? [
        {
          key: String(product.id),
          label: product.color?.name ?? '',
          hex: product.color?.hex_code ?? null,
          variation: null,
          frame,
        },
      ]
    : [];
}

const TryOnScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'TryOn'>>();
  const { productId, variationId } = route.params;
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const { product, loading: productLoading, error: productError } = useProductDetail(productId);
  const permission = useCameraPermission();

  // ── Lifecycle: no camera / GL unless focused and in the foreground ─────────
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);
  const active = isFocused && appActive && permission.state === 'granted';

  // ── Options + selection ────────────────────────────────────────────────────
  const options = useMemo(() => (product ? tryOnOptions(product) : []), [product]);
  const [selectedKey, setSelectedKey] = useState<string | null>(variationId ?? null);
  const selected = useMemo(
    () => options.find(o => o.key === selectedKey) ?? options[0] ?? null,
    [options, selectedKey],
  );

  // ── Tracking + camera ──────────────────────────────────────────────────────
  const tracking = useFaceTracking(active);
  const photoOutput = usePhotoOutput({
    // 4:3 like the analysed frames, so the photo covers the same field of view.
    targetResolution: CommonResolutions.FHD_4_3,
    quality: 0.92,
    qualityPrioritization: 'speed',
  });
  const outputs = useMemo(() => [tracking.frameOutput, photoOutput], [tracking.frameOutput, photoOutput]);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  useEffect(() => {
    if (!active) setCameraStarted(false);
  }, [active]);

  // ── Layout (the GL view and the preview share it) ──────────────────────────
  const [layout, setLayout] = useState<{ width: number; height: number } | null>(null);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout(prev => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  // ── GLB: download (progress) → prepare → parse; per colourway ──────────────
  const [glb, setGlb] = useState<GlbState>({ status: 'idle' });
  const glbPath = selected?.frame.glbPath ?? null;
  const loadFrame = useVtoStore(s => s.loadFrame);
  useEffect(() => {
    if (!active || !glbPath || !selected) {
      setGlb({ status: 'idle' });
      return;
    }
    let cancelled = false;
    // The website's store reset: this colourway's calibration, width, arms.
    loadFrame(selected.frame);
    setGlb({ status: 'downloading', progress: null });
    let lastPct = -1;
    loadGlb(glbPath, p => {
      if (cancelled) return;
      // Only re-render on whole-percent changes.
      const pct = p == null ? -1 : Math.round(p * 100);
      if (pct === lastPct) return;
      lastPct = pct;
      setGlb(pct >= 100 ? { status: 'parsing' } : { status: 'downloading', progress: p });
    })
      .then(gltf => {
        if (!cancelled) setGlb({ status: 'ready', gltf, key: selected.key });
      })
      .catch(err => {
        if (cancelled) return;
        const message = String(err?.message ?? err).slice(0, 300);
        console.warn('[TryOn] GLB failed:', message);
        posthog?.capture('try_on_model_failed', { product_id: productId, url: glbPath, error: message });
        setGlb({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
    // `selected` is captured via its key and glbPath.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, glbPath, selected?.key, loadFrame, productId]);
  const gltf = glb.status === 'ready' ? glb.gltf : null;

  // ── Face status, first-fit metric ──────────────────────────────────────────
  const [faceDetected, setFaceDetected] = useState<boolean | null>(null);
  useEffect(() => {
    if (!active) setFaceDetected(null);
  }, [active]);

  const openedAt = useRef(Date.now());
  const firstFitLogged = useRef(false);
  const onFirstFit = useCallback(() => {
    if (firstFitLogged.current) return;
    firstFitLogged.current = true;
    const ms = Date.now() - openedAt.current;
    if (__DEV__) console.log(`[TryOn] first fitted frame after ${ms} ms`);
    posthog?.capture('try_on_first_fit', { ms, product_id: productId });
    // Warm the other colourways so switching is instant.
    (async () => {
      for (const o of options) {
        if (o.frame.glbPath !== glbPath) await prefetchGlb(o.frame.glbPath).catch(() => {});
      }
    })();
  }, [productId, options, glbPath]);

  // ── Photo ──────────────────────────────────────────────────────────────────
  const canvasRef = useRef<TryOnCanvasHandle>(null);
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [capturing, setCapturing] = useState(false);

  // Photos are temporary until saved; clear them when the screen goes away.
  useEffect(
    () => () => {
      try {
        const dir = new Directory(Paths.cache, PHOTO_DIR);
        if (dir.exists) dir.delete();
      } catch {
        // Best effort.
      }
    },
    [],
  );

  const captionTitle = useMemo(() => {
    if (!product) return '';
    const name = product.name ?? product.item_name ?? '';
    const brand = product.brand?.name;
    return brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${brand} - ${name}` : name;
  }, [product]);
  const captionSubtitle = selected?.label ? `${t('TryOn.photo_frame_color')}: ${selected.label}` : '';

  const takePhoto = async () => {
    const canvas = canvasRef.current;
    if (capturing || !canvas || !layout) return;
    setCapturing(true);
    try {
      // The glasses are grabbed at the shutter moment, so they match the photo.
      let overlay: ReturnType<TryOnCanvasHandle['snapshot']> | null = null;
      const grab = () => {
        overlay ??= canvas.snapshot();
      };
      const file = await photoOutput.capturePhotoToFile(
        { flashMode: 'off', enableShutterSound: true },
        { onDidCapturePhoto: grab },
      );
      grab();
      const gl = await overlay!;

      // Everything in the GL view's own pixels (the saved resolution).
      const k = gl.width / layout.width;
      const aspect = tracking.frameAspectRef.current ?? 3 / 4;
      const g = coverGeometry(layout.width * k, layout.height * k, aspect);
      const km = i18n.language === 'km';
      const result = await composePhotoCard({
        photoPath: file.filePath,
        photoOrientation: file.orientation,
        photoMirrored: file.isMirrored,
        overlayPath: gl.uri,
        ...g,
        mirror: true,
        title: captionTitle,
        subtitle: captionSubtitle,
        fontFamily: km ? 'Hanuman-Regular' : 'DMSans-Regular',
        boldFontFamily: km ? 'Hanuman-Regular' : 'DMSans-Regular',
        outputPath: `${Paths.cache.uri.replace(/\/?$/, '/')}${PHOTO_DIR}/tryon-${Date.now()}.jpg`,
        jpegQuality: 0.92,
      });
      setPhoto({ uri: `file://${result.path}`, width: result.width, height: result.height });
      posthog?.capture('try_on_photo_taken', { product_id: productId });
    } catch (e) {
      console.warn('[TryOn] photo failed:', e);
      Alert.alert(t('Error'), t('TryOn.photo_failed'));
    } finally {
      setCapturing(false);
    }
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const close = () => navigation.goBack();

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
  if (active && options.length > 0) {
    if (cameraError) {
      statusText = t('TryOn.start_error_title');
    } else if (!cameraStarted) {
      statusText = t('TryOn.starting_camera');
      statusBusy = true;
    } else if (glb.status === 'downloading') {
      statusText =
        glb.progress != null
          ? t('TryOn.loading_model', { percent: Math.round(glb.progress * 100) })
          : t('TryOn.loading_model_plain');
      statusBusy = true;
    } else if (glb.status === 'parsing') {
      statusText = t('TryOn.loading_model_plain');
      statusBusy = true;
    } else if (glb.status === 'error') {
      statusText = t('TryOn.model_error');
    } else if (tracking.error) {
      statusText = t('TryOn.start_error_title');
    } else if (!tracking.ready) {
      statusText = t('TryOn.starting_tracker');
      statusBusy = true;
    } else if (faceDetected !== true) {
      statusText = t('TryOn.position_face');
    }
  }

  const pricing = product ? variationPricing(product, selected?.variation ?? null) : null;
  const canShoot = cameraStarted && gltf != null && faceDetected === true && !capturing;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root} onLayout={onLayout}>
      {active && options.length > 0 && layout && (
        <View style={[StyleSheet.absoluteFill, styles.mirror]} pointerEvents="none">
          <Camera
            style={StyleSheet.absoluteFill}
            device="front"
            isActive
            outputs={outputs}
            mirrorMode="off"
            resizeMode="cover"
            implementationMode="compatible"
            onStarted={() => {
              setCameraError(null);
              setCameraStarted(true);
            }}
            onError={e => {
              console.warn('[TryOn] camera error:', e);
              setCameraError(e?.message ?? String(e));
              posthog?.capture('try_on_start_failed', { status: 'camera', product_id: productId });
            }}
          />
          <TryOnCanvas
            ref={canvasRef}
            tracking={tracking}
            gltf={gltf}
            width={layout.width}
            height={layout.height}
            onFace={setFaceDetected}
            onFirstFit={onFirstFit}
            onGlbEmpty={() => setGlb({ status: 'error' })}
          />
        </View>
      )}

      {permission.state !== 'granted' && (
        <PermissionGate state={permission.state} onAllow={permission.request} onClose={close} />
      )}

      {permission.state === 'granted' && !productLoading && product && options.length === 0 && (
        <View style={styles.centerMessage}>
          <AppText style={styles.messageTitle}>{t('TryOn.no_model')}</AppText>
        </View>
      )}

      {permission.state === 'granted' && (cameraError || tracking.error) && (
        <View style={styles.centerMessage}>
          <AppText style={styles.messageTitle}>{t('TryOn.start_error_title')}</AppText>
          <AppText style={styles.messageBody}>{t('TryOn.start_error_camera')}</AppText>
          <TouchableOpacity style={styles.retryBtn} onPress={close} activeOpacity={0.85}>
            <AppText style={styles.retryText}>{t('Close')}</AppText>
          </TouchableOpacity>
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

      {!!statusText && !cameraError && !tracking.error && (
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

      {/* Bottom: shutter, product panel */}
      {permission.state === 'granted' && product && options.length > 0 && (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + Spacing.sm }]} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.shutter, !canShoot && styles.shutterDisabled]}
            onPress={takePhoto}
            disabled={!canShoot}
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
  // Preview + GL view mirrored together, once (the website's scaleX(-1)).
  mirror: { transform: [{ scaleX: -1 }] },
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
