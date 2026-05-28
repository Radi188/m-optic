import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { Colors, FontSize, Spacing } from '../theme';

type NotificationType =
  | 'order'
  | 'appointment'
  | 'ready'
  | 'promotion'
  | 'newProduct'
  | 'app';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: NotificationType;
  isRead: boolean;
  image?: ImageSourcePropType;
};

const initialNotifications: NotificationItem[] = [
  {
    id: '1',
    title: 'Your glasses are ready',
    message: 'Your new glasses are ready for pickup at M Optic store.',
    time: '5 min ago',
    type: 'ready',
    isRead: false,
  },
  {
    id: '2',
    title: 'Appointment reminder',
    message: 'You have an eye test appointment tomorrow at 10:00 AM.',
    time: '1 hour ago',
    type: 'appointment',
    isRead: false,
  },
  {
    id: '3',
    title: 'Order updated',
    message:
      'Your order status has been updated. Please check your order details.',
    time: 'Today',
    type: 'order',
    isRead: true,
  },
  {
    id: '4',
    title: 'New collection available',
    message: 'Discover our latest frame collection available now in store.',
    time: 'Yesterday',
    type: 'newProduct',
    isRead: true,
    // image: require('../assets/images/demo/frame.png'),
  },
  {
    id: '5',
    title: 'Special offer',
    message: 'Get a limited-time discount on selected lenses and frames.',
    time: '2 days ago',
    type: 'promotion',
    isRead: true,
    // image: require('../assets/images/demo/promotion.png'),
  },
  {
    id: '6',
    title: 'App update',
    message: 'We improved app performance and fixed small issues.',
    time: '3 days ago',
    type: 'app',
    isRead: true,
  },
];

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'order':
      return 'bag-check-outline';
    case 'appointment':
      return 'calendar-outline';
    case 'ready':
      return 'glasses-outline';
    case 'promotion':
      return 'pricetag-outline';
    case 'newProduct':
      return 'sparkles-outline';
    case 'app':
      return 'phone-portrait-outline';
    default:
      return 'notifications-outline';
  }
};

const NotificationListScreen = () => {
  const navigation = useNavigation();

  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);

  const unreadCount = notifications.filter(item => !item.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              isRead: true,
            }
          : item,
      ),
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(item => ({
        ...item,
        isRead: true,
      })),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.appHeader}>
          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={23} color={Colors.black} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.85}
            onPress={markAllAsRead}
          >
            <Ionicons
              name="checkmark-done-outline"
              size={21}
              color={Colors.primary}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconBox}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color={Colors.primary}
              />

              {unreadCount > 0 ? <View style={styles.badgeDot} /> : null}
            </View>

            <View style={styles.summaryTextWrap}>
              <Text style={styles.summaryTitle}>Latest updates</Text>
              <Text style={styles.summarySubtitle}>
                Orders, appointments, pickup alerts and offers.
              </Text>
            </View>
          </View>

          {notifications.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconBox}>
                <Ionicons
                  name="notifications-off-outline"
                  size={30}
                  color={Colors.gray500}
                />
              </View>

              <Text style={styles.emptyTitle}>No notifications yet</Text>

              <Text style={styles.emptyText}>
                New updates about your orders and appointments will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.notificationList}>
              {notifications.map(item => {
                const iconName = getNotificationIcon(item.type);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.notificationItem,
                      !item.isRead && styles.unreadItem,
                    ]}
                    activeOpacity={0.86}
                    onPress={() => markAsRead(item.id)}
                  >
                    {item.image ? (
                      <Image
                        source={item.image}
                        style={styles.notificationImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.iconBox,
                          !item.isRead && styles.unreadIconBox,
                        ]}
                      >
                        <Ionicons
                          name={iconName as any}
                          size={21}
                          color={Colors.primary}
                        />
                      </View>
                    )}

                    <View style={styles.textWrap}>
                      <View style={styles.titleRow}>
                        <Text
                          style={[
                            styles.title,
                            !item.isRead && styles.unreadTitle,
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>

                        {!item.isRead ? (
                          <View style={styles.unreadDot} />
                        ) : null}
                      </View>

                      <Text style={styles.message} numberOfLines={2}>
                        {item.message}
                      </Text>

                      <Text style={styles.time}>{item.time}</Text>
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
});
