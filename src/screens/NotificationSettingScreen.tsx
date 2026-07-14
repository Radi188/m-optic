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
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, Spacing } from '../theme';
import AppText from '../components/AppText';

type NotificationSetting = {
  id: string;
  titleKey: string;
  subtitleKey: string;
  icon: string;
};

const notificationSettings: NotificationSetting[] = [
  {
    id: 'push',
    titleKey: 'PushNotifications',
    subtitleKey: 'PushNotificationsSubtitle',
    icon: 'notifications-outline',
  },
  {
    id: 'ready',
    titleKey: 'GlassesReady',
    subtitleKey: 'GlassesReadySubtitle',
    icon: 'glasses-outline',
  },
  {
    id: 'promotion',
    titleKey: 'Promotions',
    subtitleKey: 'PromotionsSubtitle',
    icon: 'pricetag-outline',
  },
  {
    id: 'newProduct',
    titleKey: 'NewProducts',
    subtitleKey: 'NewProductsSubtitle',
    icon: 'sparkles-outline',
  },
  {
    id: 'tips',
    titleKey: 'EyeCareTips',
    subtitleKey: 'EyeCareTipsSubtitle',
    icon: 'bulb-outline',
  },
  {
    id: 'app',
    titleKey: 'AppUpdates',
    subtitleKey: 'AppUpdatesSubtitle',
    icon: 'phone-portrait-outline',
  },
];

const NotificationSettingsScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();

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

          <AppText style={styles.headerTitle}>{t('Notifications')}</AppText>

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
                    <AppText style={styles.title}>{t(item.titleKey)}</AppText>
                    <AppText style={styles.subtitle}>
                      {t(item.subtitleKey)}
                    </AppText>
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
              <AppText style={styles.infoTitle}>
                {t('AboutNotifications')}
              </AppText>
              <AppText style={styles.infoText}>
                {t('AboutNotificationsText')}
              </AppText>
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
