import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Colors, FontSize, Spacing, Shadow } from '../../../theme';
import { AnnouncementItem } from '../../../types/home';
import AppText from '../../AppText';

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
  const { t, i18n } = useTranslation();

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

  const renderItem = ({ item }: { item: AnnouncementItem }) => {
    const previewText = stripHtml(item.content);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.shadowWrapper}
        onPress={() => openModal(item)}
      >
        <View style={styles.card}>
          <Image
            source={{ uri: item.banner_image || '' }}
            style={styles.image}
          />

          <View style={styles.content}>
            <AppText style={styles.date}>
              {formatCreatedAt(item.created_at)}
            </AppText>

            <AppText style={styles.title} numberOfLines={1}>
              {item.title}
            </AppText>

            <AppText style={styles.body} numberOfLines={2} ellipsizeMode="tail">
              {previewText}
            </AppText>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppText style={styles.sectionTitle}>{t('announcementTitle')}</AppText>

      <FlatList
        data={annoucements}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        showsVerticalScrollIndicator={false}
      />

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

            {selectedAnnouncement?.banner_image ? (
              <Image
                source={{ uri: selectedAnnouncement.banner_image }}
                style={styles.modalImage}
              />
            ) : null}

            <ScrollView showsVerticalScrollIndicator={false}>
              <AppText style={styles.modalDate}>
                {formatCreatedAt(selectedAnnouncement?.created_at)}
              </AppText>

              <AppText style={styles.modalTitle}>
                {selectedAnnouncement?.title}
              </AppText>

              <AppText style={styles.modalBody}>
                {stripHtml(selectedAnnouncement?.content)}
              </AppText>
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
    aspectRatio: 1.4,
    borderRadius: 16,
    resizeMode: 'cover',
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

  modalBody: {
    fontSize: 14,
    color: Colors.gray700,
    lineHeight: 22,
  },
});
