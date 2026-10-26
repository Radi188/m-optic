import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Colors, FontSize, Spacing, Shadow } from '../../../theme';
import { AnnouncementItem } from '../../../types/home';
import AppText from '../../AppText';
import AppImage from '../../AppImage';
import AnnouncementDetailSheet, {
  formatAnnouncementDate,
  inlineEmoji,
  resolveAnnouncementImage,
} from './AnnouncementDetailSheet';

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

const AnnouncementSection = ({ annoucements }: AnnouncementSectionProps) => {
  const { t, i18n } = useTranslation();
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<AnnouncementItem | null>(null);

  const renderAnnouncement = (item: AnnouncementItem) => {
    const previewText = stripHtml(item.content);
    const bannerImage = resolveAnnouncementImage(item.banner_image);

    return (
      <TouchableOpacity
        key={String(item.id)}
        activeOpacity={0.85}
        style={styles.shadowWrapper}
        onPress={() => setSelectedAnnouncement(item)}
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
                {formatAnnouncementDate(item.created_at, i18n.language)}
              </AppText>

              {item.is_featured && (
                <View style={styles.featuredPill}>
                  <AppText style={styles.featuredText}>{t('Featured')}</AppText>
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

      <AnnouncementDetailSheet
        announcement={selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
      />
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

  body: {
    fontSize: 12,
    color: Colors.gray600,
    lineHeight: 18,
  },
});
