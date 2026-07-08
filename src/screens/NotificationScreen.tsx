import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions, // 1. Import useWindowDimensions for width tracking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import RenderHTML from 'react-native-render-html'; // 2. Bring back your HTML render library
import { Colors, FontSize, Spacing } from '../theme';
import { useAnnouncements, AnnouncementItem } from '../hook/useAnnouncement';
import AnnouncementSkeleton from '../components/ui/Loading/AnnouncementLoadingSkeleton';
import Header from '../components/ui/Header/HeaderComponent';
import ErrorComponent from '../components/ui/Error/ErrorComponent';
import AppText from '../components/AppText';

const getNotificationIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('order')) return 'bag-check-outline';
  if (t.includes('appoint')) return 'calendar-outline';
  if (t.includes('promo') || t.includes('off')) return 'pricetag-outline';
  return 'notifications-outline';
};

const NotificationListScreen = () => {
  const navigation = useNavigation();
  const { width } = useWindowDimensions(); // 3. Dynamically read width for your dynamic padding calculations
  const { data, loading, error, refetch } = useAnnouncements();
  // helpers/htmlTruncate.ts
  /**
   * Truncate HTML content safely while preserving inline tags like <b>, <i>, <strong>, <em>
   * @param htmlString - original HTML string
   * @param maxLength - maximum number of characters
   * @returns truncated HTML string
   */
  const truncateHtml = (htmlString: string, maxLength = 70) => {
    if (!htmlString) return '';

    // 1. Replace block elements with spaces so words don't run together
    let text = htmlString.replace(/<\/p>|<br\s*\/?>|<\/div>|<\/li>/gi, ' ');

    // 2. Remove all tags except inline formatting
    text = text.replace(/<(?!\/?(b|strong|i|em)\b)[^>]*>/gi, '');

    // 3. Truncate without breaking inline tags
    if (text.length <= maxLength) return text;

    // Cut to maxLength, then close any open tags
    let truncated = text.substring(0, maxLength);

    // Optional: simple way to ensure no dangling tags by removing last incomplete tag
    truncated = truncated.replace(/<[^>]*$/g, '');

    return truncated + '...';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Notifications" onBack={() => navigation.goBack()} />
        <AnnouncementSkeleton />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Notifications" onBack={() => navigation.goBack()} />
        <ErrorComponent onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const announcements: AnnouncementItem[] = data?.data || [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* App Header */}
        <View style={styles.appHeader}>
          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={23} color={Colors.black} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <AppText style={styles.headerTitle}>Notifications</AppText>
          </View>

          {/* <TouchableOpacity style={styles.headerButton} activeOpacity={0.85}>
            <Ionicons
              name="checkmark-done-outline"
              size={21}
              color={Colors.primary}
            />
          </TouchableOpacity> */}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Summary Banner Card */}
          {/* <View style={styles.summaryCard}>
            <View style={styles.summaryIconBox}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color={Colors.primary}
              />
            </View>

            <View style={styles.summaryTextWrap}>
              <AppText style={styles.summaryTitle}>Latest updates</AppText>
              <AppText style={styles.summarySubtitle}>
                Orders, appointments, pickup alerts and offers.
              </AppText>
            </View>
          </View> */}

          {/* List Layout conditional mapping */}
          {announcements.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconBox}>
                <Ionicons
                  name="notifications-off-outline"
                  size={30}
                  color={Colors.gray500}
                />
              </View>
              <AppText style={styles.emptyTitle}>No notifications yet</AppText>
              <AppText style={styles.emptyText}>
                New updates about your orders and appointments will appear here.
              </AppText>
            </View>
          ) : (
            <View style={styles.notificationList}>
              {announcements.map(item => {
                const iconName = getNotificationIcon(item.title);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.notificationItem}
                    activeOpacity={0.86}
                  >
                    {item.banner_image ? (
                      <Image
                        source={{ uri: item.banner_image }}
                        style={styles.notificationImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.iconBox}>
                        <Ionicons
                          name={iconName as any}
                          size={21}
                          color={Colors.primary}
                        />
                      </View>
                    )}

                    <View style={styles.textWrap}>
                      <View style={styles.titleRow}>
                        <AppText style={styles.title} numberOfLines={1}>
                          {item.title}
                        </AppText>
                      </View>

                      {/* 4. Swapped out plain <AppText> for your customized <RenderHTML /> component */}
                      <View style={styles.htmlContainer}>
                        {/* We wrap the clean string in a native layout Text element */}

                        <RenderHTML
                          contentWidth={
                            width - Spacing.lg * 2 - Spacing.md * 2 - 50
                          }
                          // Pass the cleaned HTML string here
                          source={{ html: truncateHtml(item.content) }}
                          tagsStyles={{
                            strong: styles.htmlStrong,
                            b: styles.htmlStrong,
                          }}
                        />
                      </View>

                      <AppText style={styles.time}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </AppText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default NotificationListScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF7F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAF7F5',
  },

  appHeader: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#FAF7F5',
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFE5E0',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.black,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray500,
  },

  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },

  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#EFE5E0',
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIconBox: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#F7EFEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  badgeDot: {
    position: 'absolute',
    top: 11,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D92D20',
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: FontSize.md,
    fontWeight: '900',
    color: Colors.black,
  },
  summarySubtitle: {
    marginTop: 4,
    fontSize: FontSize.sm,
    color: Colors.gray500,
    lineHeight: 19,
  },

  notificationList: {
    gap: Spacing.md,
  },

  notificationItem: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#EFE5E0',
  },
  unreadItem: {
    backgroundColor: '#FFFCFA',
    borderColor: '#E8D8CF',
  },

  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: '#F7EFEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  unreadIconBox: {
    backgroundColor: '#F1E3DA',
  },
  notificationImage: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: '#F7EFEA',
    marginRight: Spacing.md,
  },

  textWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.1,
  },
  unreadTitle: {
    fontWeight: '900',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: Spacing.sm,
  },
  message: {
    marginTop: 4,
    fontSize: FontSize.sm,
    color: Colors.gray500,
    lineHeight: 18,
  },
  time: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.gray500,
    fontWeight: '700',
  },

  emptyBox: {
    backgroundColor: Colors.white,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#EFE5E0',
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: '#F7EFEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.black,
  },
  emptyText: {
    marginTop: 8,
    fontSize: FontSize.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Keep all your original styles, just add these targets at the end:
  htmlContainer: {
    marginTop: 4,
  },
  htmlBase: {
    color: Colors.gray500,
  },
  htmlP: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    lineHeight: 18,
    marginVertical: 2,
  },
  htmlUl: {
    paddingLeft: 12,
    marginVertical: 2,
  },
  htmlOl: {
    paddingLeft: 12,
    marginVertical: 2,
  },
  htmlLi: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    lineHeight: 18,
  },
  htmlStrong: {
    fontWeight: '800',
    color: Colors.black,
  },
});
