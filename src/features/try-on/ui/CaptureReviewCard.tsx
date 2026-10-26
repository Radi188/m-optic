import React from 'react';
import {
  Image,
  Modal,
  Platform,
  Share,
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

export interface CapturedPhoto {
  /** The finished card — photo, M-Optic mark, frame and colour — as JPEG. */
  dataUrl: string;
  width: number;
  height: number;
}

type Props = {
  photo: CapturedPhoto | null;
  productId: string;
  onClose: () => void;
};

/**
 * The review card for a try-on shot. The image IS the saved card: the engine
 * composes it (the website's photoCard) at full resolution, so what the wearer
 * approves here is exactly the file they share.
 *
 * Sharing goes through React Native's own share sheet, which on iOS accepts the
 * image itself (and offers saving it from there). Android's built-in share can
 * only send text, and saving straight to the photo library needs a camera-roll
 * native module on both platforms — not in the app yet, so Android shows why
 * the buttons are missing rather than a button that does nothing.
 */
const CaptureReviewCard: React.FC<Props> = ({ photo, productId, onClose }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const canShareImage = Platform.OS === 'ios';

  if (!photo) return null;

  // Fit the card inside the screen, leaving room for the buttons.
  const maxW = width - Spacing.lg * 2;
  const maxH = height - insets.top - insets.bottom - 180;
  const scale = Math.min(maxW / photo.width, maxH / photo.height);

  const share = async () => {
    try {
      const result = await Share.share({ url: photo.dataUrl });
      if (result.action === Share.sharedAction) {
        posthog?.capture('try_on_photo_shared', { product_id: productId });
      }
    } catch {
      // The user cancelled or the sheet failed; nothing to recover.
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.backdrop, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.md }]}>
        <AppText style={styles.title}>{t('TryOn.photo_preview_title')}</AppText>

        <Image
          source={{ uri: photo.dataUrl }}
          style={[styles.photo, { width: photo.width * scale, height: photo.height * scale }]}
          resizeMode="contain"
          accessibilityLabel={t('TryOn.photo_preview_title')}
        />

        {!canShareImage && (
          <AppText style={styles.note}>{t('TryOn.photo_save_unavailable')}</AppText>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondary} activeOpacity={0.85} onPress={onClose}>
            <Ionicons name="refresh-outline" size={18} color={Colors.black} />
            <AppText style={styles.secondaryText}>{t('TryOn.photo_retake')}</AppText>
          </TouchableOpacity>
          {canShareImage && (
            <TouchableOpacity style={styles.primary} activeOpacity={0.85} onPress={share}>
              <Ionicons name="share-outline" size={18} color={Colors.white} />
              <AppText style={styles.primaryText}>{t('TryOn.photo_share')}</AppText>
            </TouchableOpacity>
          )}
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
    backgroundColor: 'rgba(15,12,10,0.92)',
    paddingHorizontal: Spacing.lg,
  },
  title: { fontSize: FontSize.md, fontWeight: '700', color: Colors.white },
  photo: { borderRadius: 4 },
  note: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 18,
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
  secondaryText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.black },
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
  primaryText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.white },
});
