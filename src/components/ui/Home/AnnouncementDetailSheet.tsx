import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import RenderHTML, { defaultSystemFonts } from 'react-native-render-html';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Colors, FontSize, Layout, Spacing } from '../../../theme';
import type { AnnouncementItem } from '../../../types/home';
import { buildFileUrl } from '../../../utils/fileUrlHelper';
import { useResponsive } from '../../../hook/useResponsive';
import AppText from '../../AppText';
import AppImage from '../../AppImage';

/**
 * `banner_image` arrives either as a bare storage path ("uploads/…") or as an
 * absolute URL depending on the endpoint, so both are accepted.
 */
export const resolveAnnouncementImage = (
  value?: string | null,
): string | null => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return buildFileUrl(value);
};

/**
 * Inline emoji images → the characters they stand for.
 *
 * The shop composes these posts by pasting from Facebook, which encodes every
 * emoji as a 16x16 `<img>` from its own CDN. RenderHTML treats an `<img>` as a
 * block-level element, so each one was pushed onto its own centred line and
 * the paragraphs were shredded. Substituting the `alt` character puts them
 * back in the sentence, renders them at the text's own size, and drops the
 * dependency on a Facebook CDN that may be slow or blocked.
 *
 * Only small or emoji-CDN images are swapped: a real photo in the body is
 * still rendered as an image.
 */
const EMOJI_SRC = /emoji\.php|\/emoji\//i;

export const inlineEmoji = (html: string) =>
  html.replace(/<img\b[^>]*>/gi, tag => {
    const alt = tag.match(/\balt="([^"]*)"/i)?.[1];
    if (!alt) return tag;

    const width = Number(tag.match(/\bwidth="(\d+)"/i)?.[1] ?? NaN);
    const src = tag.match(/\bsrc="([^"]*)"/i)?.[1] ?? '';

    const isEmoji =
      EMOJI_SRC.test(src) || (Number.isFinite(width) && width <= 32);

    return isEmoji ? alt : tag;
  });

export const formatAnnouncementDate = (
  date: string | undefined,
  language: string,
) => {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(language === 'km' ? 'km-KH' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Fonts for the rich-text body.
 *
 * Everything else in the app draws through AppText, which picks Hanuman for
 * Khmer and DM Sans for English. RenderHTML knows nothing about that, so
 * without this the Khmer announcement body fell back to the system font and
 * rendered with the wrong shaping. `systemFonts` is what lets a custom family
 * resolve inside the renderer at all.
 */
const HTML_SYSTEM_FONTS = [
  ...defaultSystemFonts,
  'Hanuman-Regular',
  'Hanuman-Bold',
  'DMSans-Regular',
  'DMSans-Bold',
];

const SHEET_OFFSET = 500;
// Until the poster's real size is known, assume a portrait one.
const FALLBACK_RATIO = 4 / 5;

type Props = {
  announcement: AnnouncementItem | null;
  onClose: () => void;
  /**
   * Render without its own Modal, for a caller that is already inside one
   * (the home pop-up). Two native modals handing over to each other is
   * unreliable on iOS — the second can silently fail to present.
   */
  embedded?: boolean;
};

/**
 * The whole announcement: full poster, date, title, rich-text body and its
 * link. Slides up from the bottom.
 */
const AnnouncementDetailSheet: React.FC<Props> = ({
  announcement,
  onClose,
  embedded = false,
}) => {
  const { t, i18n } = useTranslation();
  // The sheet is a readable-width column on iPad, inset by its own padding.
  const { readableWidth } = useResponsive();
  const contentWidth = readableWidth - Spacing.md * 2;

  const isKhmer = i18n.language === 'km';
  const bodyFont = isKhmer ? 'Hanuman-Regular' : 'DMSans-Regular';
  const boldFont = isKhmer ? 'Hanuman-Bold' : 'DMSans-Bold';

  const slideAnim = useRef(new Animated.Value(SHEET_OFFSET)).current;
  const [ratio, setRatio] = useState(FALLBACK_RATIO);
  const imageUrl = resolveAnnouncementImage(announcement?.banner_image);

  useEffect(() => {
    if (!announcement) return;
    slideAnim.setValue(SHEET_OFFSET);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [announcement, slideAnim]);

  // The poster is shown whole, at its own shape — it is the promotion.
  useEffect(() => {
    if (!imageUrl) return;
    Image.getSize(
      imageUrl,
      (w, h) => w > 0 && h > 0 && setRatio(w / h),
      () => {},
    );
  }, [imageUrl]);

  const close = () => {
    Animated.timing(slideAnim, {
      toValue: SHEET_OFFSET,
      duration: 220,
      useNativeDriver: true,
    }).start(onClose);
  };

  if (!announcement) return null;

  const sheet = (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={StyleSheet.absoluteFillObject}
        activeOpacity={1}
        onPress={close}
      />
      <Animated.View
        style={[styles.card, { transform: [{ translateY: slideAnim }] }]}
      >
        <TouchableOpacity
          style={styles.closeButton}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={t('Close')}
        >
          <Ionicons name="close" size={22} color={Colors.black} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false}>
          {!!imageUrl && (
            <AppImage
              source={{ uri: imageUrl }}
              style={[styles.image, { aspectRatio: ratio }]}
              resizeMode="contain"
            />
          )}

          <AppText style={styles.date}>
            {formatAnnouncementDate(announcement.created_at, i18n.language)}
          </AppText>

          <AppText style={styles.title}>{announcement.title}</AppText>

          {/* The body is rich text with paragraphs and inline emoji images.
              Flattening it to a string collapsed the paragraph breaks into one
              block and dropped the emoji entirely, so it is rendered as HTML. */}
          {!!announcement.content && (
            <RenderHTML
              contentWidth={contentWidth}
              source={{ html: inlineEmoji(announcement.content) }}
              systemFonts={HTML_SYSTEM_FONTS}
              baseStyle={{ ...styles.htmlBase, fontFamily: bodyFont }}
              tagsStyles={{
                p: { ...styles.htmlP, fontFamily: bodyFont },
                li: { ...styles.htmlP, fontFamily: bodyFont },
                strong: { ...styles.htmlStrong, fontFamily: boldFont },
                b: { ...styles.htmlStrong, fontFamily: boldFont },
                img: styles.htmlImg,
                a: styles.htmlLink,
              }}
              // Photos in the body arrive without width/height and would
              // otherwise render at their intrinsic size and overflow the
              // sheet; this scales them to the available width.
              renderersProps={{
                img: { enableExperimentalPercentWidth: true },
                a: {
                  onPress: (_e, href) => Linking.openURL(href).catch(() => {}),
                },
              }}
              enableExperimentalMarginCollapsing
            />
          )}

          {!!announcement.link_url && (
            <TouchableOpacity
              style={styles.linkButton}
              activeOpacity={0.85}
              onPress={() =>
                Linking.openURL(announcement.link_url!).catch(() => {})
              }
            >
              <AppText style={styles.linkButtonText}>
                {announcement.link_text || t('LearnMore')}
              </AppText>
              <Ionicons name="open-outline" size={15} color={Colors.white} />
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );

  if (embedded) return sheet;

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      {sheet}
    </Modal>
  );
};

export default AnnouncementDetailSheet;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    ...Layout.readable,
    maxHeight: '88%',
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.md,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  image: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: Colors.gray100,
    marginBottom: 12,
  },
  date: {
    fontSize: 12,
    color: Colors.gray500,
    marginBottom: 6,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: 10,
  },
  htmlBase: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.gray700,
  },
  htmlP: {
    marginTop: 0,
    marginBottom: 10,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.gray700,
  },
  htmlStrong: {
    fontWeight: '800',
    color: Colors.black,
  },
  // Only genuine photos reach this style — emoji are substituted for their
  // characters before rendering.
  htmlImg: {
    alignSelf: 'center',
    borderRadius: 12,
    marginVertical: 6,
  },
  htmlLink: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  linkButton: {
    marginTop: 6,
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  linkButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.white,
  },
});
