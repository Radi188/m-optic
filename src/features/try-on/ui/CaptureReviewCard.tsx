import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import AppText from '../../../components/AppText';
import { BorderRadius, Colors, FontSize, Spacing } from '../../../theme';
import { posthog } from '../../../config/posthog';
import { savePhotoToLibrary, sharePhoto } from './savePhoto';

export interface CapturedPhoto {
  /** The finished card (photo, M-Optic mark, frame and colour) as a JPEG file. */
  uri: string;
  width: number;
  height: number;
}

type Props = {
  photo: CapturedPhoto | null;
  productId: string;
  onClose: () => void;
};

/**
 * The review card for a try-on shot. The image IS the saved file — composed
 * natively at full resolution like the website's photoCard — so what the
 * wearer approves here is exactly what Save and Share hand over.
 */
const CaptureReviewCard: React.FC<Props> = ({ photo, productId, onClose }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // A new photo starts unsaved.
  const [lastUri, setLastUri] = useState<string | null>(null);
  if (photo && photo.uri !== lastUri) {
    setLastUri(photo.uri);
    setSaved(false);
  }

  if (!photo) return null;

  const maxW = width - Spacing.lg * 2;
  const maxH = height - insets.top - insets.bottom - 190;
  const scale = Math.min(maxW / photo.width, maxH / photo.height);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const result = await savePhotoToLibrary(photo.uri);
      if (result === 'saved') {
        setSaved(true);
        posthog?.capture('try_on_photo_saved', { product_id: productId });
      } else {
        Alert.alert(t('TryOn.photo_save_denied_title'), t('TryOn.photo_save_denied_body'), [
          { text: t('Close'), style: 'cancel' },
          { text: t('TryOn.open_settings'), onPress: () => Linking.openSettings().catch(() => {}) },
        ]);
      }
    } catch (e) {
      console.warn('[TryOn] save failed:', e);
      Alert.alert(t('Error'), t('TryOn.photo_save_failed'));
    } finally {
      setSaving(false);
    }
  };

  const share = async () => {
    try {
      await sharePhoto(photo.uri, t('TryOn.photo_preview_title'));
      posthog?.capture('try_on_photo_shared', { product_id: productId });
    } catch {
      // Cancelled or unavailable; nothing to recover.
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View
        style={[
          styles.backdrop,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.md },
        ]}
      >
        <View style={styles.header}>
          <AppText style={styles.title}>{t('TryOn.photo_preview_title')}</AppText>
          <TouchableOpacity
            onPress={onClose}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel={t('TryOn.photo_discard')}
          >
            <Ionicons name="close" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <Image
          source={{ uri: photo.uri }}
          style={{ width: photo.width * scale, height: photo.height * scale }}
          resizeMode="contain"
          accessibilityLabel={t('TryOn.photo_preview_title')}
        />

        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondary} activeOpacity={0.85} onPress={onClose}>
            <Ionicons name="refresh-outline" size={18} color={Colors.black} />
            <AppText style={styles.secondaryText}>{t('TryOn.photo_retake')}</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondary}
            activeOpacity={0.85}
            onPress={save}
            disabled={saving || saved}
          >
            {saving ? (
              <ActivityIndicator color={Colors.black} />
            ) : (
              <Ionicons name={saved ? 'checkmark' : 'download-outline'} size={18} color={Colors.black} />
            )}
            <AppText style={styles.secondaryText}>
              {saved ? t('TryOn.photo_saved') : t('TryOn.photo_save')}
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primary} activeOpacity={0.85} onPress={share}>
            <Ionicons name="share-outline" size={18} color={Colors.white} />
            <AppText style={styles.primaryText}>{t('TryOn.photo_share')}</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default CaptureReviewCard;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(15,12,10,0.94)',
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: FontSize.md, fontWeight: '700', color: Colors.white },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  actions: { flexDirection: 'row', gap: Spacing.sm, alignSelf: 'stretch' },
  secondary: {
    flex: 1,
    height: 50,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.black },
  primary: {
    flex: 1,
    height: 50,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
});
