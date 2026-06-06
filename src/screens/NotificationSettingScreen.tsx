import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { Colors, FontSize, Spacing } from '../theme';

type NotificationSetting = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
};

const notificationSettings: NotificationSetting[] = [
  {
    id: 'push',
    title: 'Push Notifications',
    subtitle: 'Receive notifications on your device',
    icon: 'notifications-outline',
  },
  //   {
  //     id: 'order',
  //     title: 'Order Updates',
  //     subtitle: 'Get updates about your orders and purchases',
  //     icon: 'bag-check-outline',
  //   },
  //   {
  //     id: 'appointment',
  //     title: 'Appointment Reminders',
  //     subtitle: 'Reminders for eye test and store appointments',
  //     icon: 'calendar-outline',
  //   },
  {
    id: 'ready',
    title: 'Glasses Ready',
    subtitle: 'Notify me when your glasses are ready',
    icon: 'glasses-outline',
  },
  {
    id: 'promotion',
    title: 'Promotions',
    subtitle: 'Special offers, discounts, and campaigns',
    icon: 'pricetag-outline',
  },
  {
    id: 'newProduct',
    title: 'New Products',
    subtitle: 'New frames, lenses, and collections',
    icon: 'sparkles-outline',
  },
  {
    id: 'tips',
    title: 'Eye Care Tips',
    subtitle: 'Useful tips for eye health and lens care',
    icon: 'bulb-outline',
  },
  {
    id: 'app',
    title: 'App Updates',
    subtitle: 'New features and important app updates',
    icon: 'phone-portrait-outline',
  },
];

const NotificationSettingsScreen = () => {
  const navigation = useNavigation();

  const [settings, setSettings] = useState<Record<string, boolean>>({
    push: true,
    order: true,
    appointment: true,
    ready: true,
    promotion: false,
    newProduct: true,
    tips: false,
    app: true,
  });

  const toggleSetting = (id: string) => {
    setSettings(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.appHeader}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.black} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Notifications</Text>

          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.card}>
            {notificationSettings.map((item, index) => {
              const isLast = index === notificationSettings.length - 1;
              const isEnabled = settings[item.id];

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.item, isLast && styles.lastItem]}
                  activeOpacity={0.85}
                  onPress={() => toggleSetting(item.id)}
                >
                  <View style={styles.iconBox}>
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color={Colors.primary}
                    />
                  </View>

                  <View style={styles.textWrap}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.subtitle}>{item.subtitle}</Text>
                  </View>

                  <View style={styles.switchWrap}>
                    <Switch
                      value={isEnabled}
                      onValueChange={() => toggleSetting(item.id)}
                      trackColor={{
                        false: '#E8DDD7',
                        true: '#D7B8A8',
                      }}
                      thumbColor={isEnabled ? Colors.primary : Colors.white}
                      ios_backgroundColor="#E8DDD7"
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.infoBox}>
            <View style={styles.infoIconBox}>
              <Ionicons
                name="information-circle-outline"
                size={22}
                color={Colors.primary}
              />
            </View>

            <View style={styles.infoTextWrap}>
              <Text style={styles.infoTitle}>About Notifications</Text>
              <Text style={styles.infoText}>
                Some important updates, such as order status or appointment
                changes, may still be shown inside the app.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default NotificationSettingsScreen;

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
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#FAF7F5',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0E7E3',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.black,
  },
  headerRightPlaceholder: {
    width: 42,
    height: 42,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.black,
  },
  screenSubtitle: {
    marginTop: 6,
    fontSize: FontSize.sm,
    color: Colors.gray500,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#F0E7E3',
    overflow: 'hidden',
  },
  item: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3ECE8',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F6EEE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textWrap: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
  },
  subtitle: {
    marginTop: 4,
    fontSize: FontSize.sm,
    color: Colors.gray500,
    lineHeight: 18,
  },
  switchWrap: {
    width: 54,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBox: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 22,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#F0E7E3',
  },
  infoIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F6EEE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
  },
  infoText: {
    marginTop: 4,
    fontSize: FontSize.sm,
    color: Colors.gray500,
    lineHeight: 19,
  },
});
