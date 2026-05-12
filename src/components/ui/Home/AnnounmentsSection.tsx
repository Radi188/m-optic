import React from 'react';
import { View, Text, FlatList, Image, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Shadow } from '../../../theme';
import { AnnouncementItem } from '../../../types/home';

type AnnouncementSectionProps = {
  annoucements: AnnouncementItem[];
};

const stripHtml = (html?: string) => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

const AnnouncementSection = ({ annoucements }: AnnouncementSectionProps) => {
  const renderItem = ({ item }: { item: AnnouncementItem }) => {
    const previewText = stripHtml(item.content);

    return (
      <View style={styles.shadowWrapper}>
        <View style={styles.card}>
          <Image
            source={{ uri: item.banner_image || '' }}
            style={styles.image}
          />

          <View style={styles.content}>
            <Text style={styles.date}>{item.created_at}</Text>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.body} numberOfLines={2} ellipsizeMode="tail">
              {previewText}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Announcements</Text>

      <FlatList
        data={annoucements}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        showsVerticalScrollIndicator={false}
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

  image: {
    width: '100%',
    aspectRatio: 1,
    resizeMode: 'cover',
  },

  content: {
    padding: 12,
  },

  date: {
    fontSize: 11,
    color: Colors.gray500,
    marginBottom: 4,
  },

  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    color: Colors.black,
  },

  body: {
    fontSize: 12,
    color: Colors.gray600,
    lineHeight: 18,
  },
});
