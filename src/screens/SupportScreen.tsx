import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, Spacing } from '../theme';
import AppText from '../components/AppText';

type SupportOption = {
  id: string;
  titleKey: string;
  subtitleKey: string;
  icon: string;
  onPress: () => void;
};

const SupportScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();

  const supportOptions: SupportOption[] = [
    {
      id: 'call',
      titleKey: 'CallSupport',
      subtitleKey: 'CallSupportSubtitle',
      icon: 'call-outline',
      onPress: () => Linking.openURL('tel:+85512345678'),
    },
    {
      id: 'telegram',
      titleKey: 'Telegram',
      subtitleKey: 'TelegramSubtitle',
      icon: 'paper-plane-outline',
      onPress: () => Linking.openURL('https://t.me/yourtelegram'),
    },
    {
      id: 'email',
      titleKey: 'EmailSupport',
      subtitleKey: 'EmailSupportSubtitle',
      icon: 'mail-outline',
      onPress: () => Linking.openURL('mailto:support@example.com'),
    },
    {
      id: 'location',
      titleKey: 'StoreLocation',
      subtitleKey: 'StoreLocationSubtitle',
      icon: 'location-outline',
      onPress: () => Linking.openURL('https://maps.google.com'),
    },
  ];

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

          <AppText style={styles.headerTitle}>{t('Support')}</AppText>

          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroIconBox}>
              <Ionicons
                name="headset-outline"
                size={30}
                color={Colors.primary}
              />
            </View>

            <AppText style={styles.heroTitle}>{t('HowCanWeHelpYou')}</AppText>
            <AppText style={styles.heroSubtitle}>
              {t('SupportHeroSubtitle')}
            </AppText>
          </View>

          <AppText style={styles.sectionTitle}>{t('ContactSupport')}</AppText>

          <View style={styles.card}>
            {supportOptions.map((item, index) => {
              const isLast = index === supportOptions.length - 1;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.item, isLast && styles.lastItem]}
                  activeOpacity={0.85}
                  onPress={item.onPress}
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

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={Colors.gray500}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default SupportScreen;

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
  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#F0E7E3',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  heroIconBox: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#F6EEE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.black,
    textAlign: 'center',
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: FontSize.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.black,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#F0E7E3',
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  item: {
    minHeight: 76,
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
  faqCard: {
    backgroundColor: Colors.white,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#F0E7E3',
    overflow: 'hidden',
  },
  faqItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3ECE8',
  },
  question: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
  },
  answer: {
    marginTop: 6,
    fontSize: FontSize.sm,
    color: Colors.gray500,
    lineHeight: 20,
  },
});
