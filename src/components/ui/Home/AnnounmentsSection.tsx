import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  Linking,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import RenderHTML, { defaultSystemFonts } from 'react-native-render-html';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Colors, FontSize, Spacing, Shadow } from '../../../theme';
import { AnnouncementItem } from '../../../types/home';
import { buildFileUrl } from '../../../utils/fileUrlHelper';
import AppText from '../../AppText';
import AppImage from '../../AppImage';

type AnnouncementSectionProps = {
  annoucements: AnnouncementItem[];
};

/**
 * Plain-text preview of an announcement body.
 *
 * The shop composes these in a rich-text editor and pastes from Facebook, so
 * the content arrives as HTML with emoji embedded as `<img alt="💥">` tags.
 * Dropping every tag also dropped those emoji, which carry a lot of the tone
 * in this copy — so an image is replaced by its `alt` before the tags go.
 */
/**
 * `banner_image` is null on the announcements the shop has published so far,
 * so the format it arrives in is unconfirmed. Elsewhere in this API images are
 * bare storage paths ("uploads/…") while a few endpoints send absolute URLs,
 * so both are accepted rather than assuming one.
 */
const resolveImage = (value?: string | null): string | null => {
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

const inlineEmoji = (html: string) =>
  html.replace(/<img\b[^>]*>/gi, tag => {
    const alt = tag.match(/\balt="([^"]*)"/i)?.[1];
    if (!alt) return tag;

    const width = Number(tag.match(/\bwidth="(\d+)"/i)?.[1] ?? NaN);
    const src = tag.match(/\bsrc="([^"]*)"/i)?.[1] ?? '';

    const isEmoji =
      EMOJI_SRC.test(src) || (Number.isFinite(width) && width <= 32);

    return isEmoji ? alt : tag;
  });

const stripHtml = (html?: string) => {
  if (!html) return '';

  return inlineEmoji(html)
    .replace(/<\/(p|div|br|li|h[1-6])>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
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

const AnnouncementSection = ({ annoucements }: AnnouncementSectionProps) => {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();

  // The sheet is inset by its own padding on both sides.
  const contentWidth = width - Spacing.md * 2;

  const isKhmer = i18n.language === 'km';
  const bodyFont = isKhmer ? 'Hanuman-Regular' : 'DMSans-Regular';
  const boldFont = isKhmer ? 'Hanuman-Bold' : 'DMSans-Bold';

  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<AnnouncementItem | null>(null);

  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (selectedAnnouncement) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedAnnouncement, slideAnim]);

  const openModal = (item: AnnouncementItem) => {
    slideAnim.setValue(500);
    setSelectedAnnouncement(item);
  };

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: 500,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setSelectedAnnouncement(null);
    });
  };

  const formatCreatedAt = (date?: string) => {
    if (!date) return '';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString(
      i18n.language === 'km' ? 'km-KH' : 'en-US',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      },
    );
  };

  const renderAnnouncement = (item: AnnouncementItem) => {
    const previewText = stripHtml(item.content);
    const bannerImage = resolveImage(item.banner_image);

    return (
      <TouchableOpacity
        key={String(item.id)}
        activeOpacity={0.85}
        style={styles.shadowWrapper}
        onPress={() => openModal(item)}
      >
        <View style={styles.card}>
          {/* `banner_image` is null on every live announcement, and the old
              card drew a full-width 1:1 Image regardless — a blank square
              above every post. It is only rendered when one exists. */}
          {!!bannerImage && (
            <AppImage
              source={{ uri: bannerImage }}
              style={styles.image}
              resizeMode="cover"
            />
          )}

          <View style={styles.content}>
            <View style={styles.cardHead}>
              <View style={styles.megaphone}>
                <Ionicons name="megaphone" size={14} color={Colors.primary} />
              </View>

              <AppText style={styles.date}>
                {formatCreatedAt(item.created_at)}
              </AppText>

              {item.is_featured && (
                <View style={styles.featuredPill}>
                  <AppText style={styles.featuredText}>
                    {t('Featured')}
                  </AppText>
                </View>
              )}
            </View>

            <AppText style={styles.title} numberOfLines={2}>
              {item.title}
            </AppText>

            <AppText style={styles.body} numberOfLines={3} ellipsizeMode="tail">
              {previewText}
            </AppText>

            <View style={styles.readMoreRow}>
              <AppText style={styles.readMore}>
                {item.link_text || t('ReadMore')}
              </AppText>
              <Ionicons
                name="chevron-forward"
                size={13}
                color={Colors.primary}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppText style={styles.sectionTitle}>{t('announcementTitle')}</AppText>

      {/* Rendered with map rather than a FlatList: this section sits inside
          the home screen's vertical ScrollView, and a nested vertical
          VirtualizedList breaks windowing (and warns). The list is short and
          the page already scrolls, so there is nothing to virtualise. */}
      {annoucements.map(renderAnnouncement)}

      <Modal
        visible={!!selectedAnnouncement}
        animationType="none"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalCard,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Ionicons name="close" size={22} color={Colors.black} />
            </TouchableOpacity>

            {!!resolveImage(selectedAnnouncement?.banner_image) && (
              <AppImage
                source={{
                  uri: resolveImage(selectedAnnouncement?.banner_image)!,
                }}
                style={styles.modalImage}
                resizeMode="cover"
              />
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              <AppText style={styles.modalDate}>
                {formatCreatedAt(selectedAnnouncement?.created_at)}
              </AppText>

              <AppText style={styles.modalTitle}>
                {selectedAnnouncement?.title}
              </AppText>

              {/* The body is rich text with paragraphs and inline emoji
                  images. Flattening it to a string collapsed the paragraph
                  breaks into one block and dropped the emoji entirely, so it
                  is rendered as HTML. */}
              {!!selectedAnnouncement?.content && (
                <RenderHTML
                  contentWidth={contentWidth}
                  source={{ html: inlineEmoji(selectedAnnouncement.content) }}
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
                      onPress: (_e, href) =>
                        Linking.openURL(href).catch(() => {}),
                    },
                  }}
                  enableExperimentalMarginCollapsing
                />
              )}

              {!!selectedAnnouncement?.link_url && (
                <TouchableOpacity
                  style={styles.linkButton}
                  activeOpacity={0.85}
                  onPress={() =>
                    Linking.openURL(selectedAnnouncement.link_url!).catch(
                      () => {},
                    )
                  }
                >
                  <AppText style={styles.linkButtonText}>
                    {selectedAnnouncement.link_text || t('LearnMore')}
                  </AppText>
                  <Ionicons
                    name="open-outline"
                    size={15}
                    color={Colors.white}
                  />
                </TouchableOpacity>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

export default AnnouncementSection;

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },

  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: 12,
  },

  shadowWrapper: {
    marginBottom: 16,
    ...Shadow.sm,
  },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
  },

  // 16:9 rather than a square: a square banner took most of the viewport
  // height for one announcement.
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.gray100,
  },

  content: {
    padding: 14,
  },

  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },

  megaphone: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  date: {
    flex: 1,
    fontSize: 11,
    color: Colors.gray500,
  },

  featuredPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: Colors.primaryLight,
  },

  featuredText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  title: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
    color: Colors.black,
    letterSpacing: -0.2,
  },

  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 10,
  },

  readMore: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
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

  // Only genuine photos reach this style now — emoji are substituted for
  // their characters before rendering.
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

  body: {
    fontSize: 12,
    color: Colors.gray600,
    lineHeight: 18,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  modalCard: {
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

  modalImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    backgroundColor: Colors.gray100,
    marginBottom: 12,
  },

  modalDate: {
    fontSize: 12,
    color: Colors.gray500,
    marginBottom: 6,
  },

  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: 10,
  },
});
