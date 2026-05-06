import React from 'react';
import { View, Text, FlatList, Image, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, Shadow } from '../../../theme';

type Announcement = {
  id: string;
  type: string;
  title: string;
  date: string;
  body: string;
  imageUri: string;
};

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a1',
    type: 'update',
    title: 'New Spring Stock Arriving',
    date: 'Apr 20, 2026',
    body: '40+ new frames from Ray-Ban, Oakley, and Gucci arriving this weekend.',
    imageUri:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'a2',
    type: 'promo',
    title: 'Weekend Promotion — 20% Off',
    date: 'Apr 19–20, 2026',
    body: 'Apply code SPRING20 at checkout. Valid on all prescription frames this weekend.',
    imageUri:
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'a3',
    type: 'alert',
    title: 'Closed on Public Holiday',
    date: 'Apr 25, 2026',
    body: 'The store will be closed on the upcoming public holiday. We reopen Apr 26.',
    imageUri:
      'https://images.unsplash.com/photo-1524230572899-a752b3835840?auto=format&fit=crop&w=800&q=80',
  },
];

const AnnouncementSection = () => {
  const renderItem = ({ item }: { item: Announcement }) => (
    <View style={styles.shadowWrapper}>
      <View style={styles.card}>
        <Image source={{ uri: item.imageUri }} style={styles.image} />

        <View style={styles.content}>
          <Text style={styles.date}>{item.date}</Text>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body} numberOfLines={2}>
            {item.body}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Announcements</Text>

      <FlatList
        data={ANNOUNCEMENTS}
        renderItem={renderItem}
        keyExtractor={item => item.id}
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
    aspectRatio: 1 / 1, // 👈 vertical image (portrait)
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
    marginBottom: 4,
  },

  body: {
    fontSize: 12,
    color: Colors.gray600,
  },
});
