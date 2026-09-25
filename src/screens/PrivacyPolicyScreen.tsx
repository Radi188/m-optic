import React from 'react';
import {
  View,
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
import { formatDate } from '../utils/dateHelper';
import {
  getPrivacyPolicy,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_LAST_UPDATED,
  type PolicySection,
} from '../content/privacyPolicy';

const PolicySectionCard = ({ section }: { section: PolicySection }) => (
  <View style={styles.card}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Ionicons name={section.icon as any} size={19} color={Colors.primary} />
      </View>
      <AppText style={styles.sectionTitle}>{section.title}</AppText>
    </View>

    {section.body?.map((paragraph, index) => (
      <AppText key={index} style={styles.paragraph}>
        {paragraph}
      </AppText>
    ))}

    {section.bullets?.map((bullet, index) => (
      <View key={index} style={styles.bulletRow}>
        <View style={styles.bulletDot} />
        <AppText style={styles.bulletText}>{bullet}</AppText>
      </View>
    ))}
  </View>
);

const PrivacyPolicyScreen = () => {
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const policy = getPrivacyPolicy(i18n.resolvedLanguage === 'km' ? 'km' : 'en');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.appHeader}>
        <TouchableOpacity
          style={styles.headerButton}
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={23} color={Colors.black} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <AppText style={styles.headerTitle}>{t('PrivacyPolicy')}</AppText>
          <AppText style={styles.headerSubtitle}>{t('DataAndSecurity')}</AppText>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <AppText style={styles.updated}>
          {t('LastUpdated')}: {formatDate(PRIVACY_LAST_UPDATED)}
        </AppText>

        <AppText style={styles.intro}>{policy.intro}</AppText>

        <View style={styles.highlightCard}>
          {policy.highlights.map(item => (
            <View key={item.icon} style={styles.highlightRow}>
              <Ionicons name={item.icon as any} size={18} color={Colors.primary} />
              <AppText style={styles.highlightText}>{item.text}</AppText>
            </View>
          ))}
        </View>

        {policy.sections.map(section => (
          <PolicySectionCard key={section.id} section={section} />
        ))}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="mail-outline" size={19} color={Colors.primary} />
            </View>
            <AppText style={styles.sectionTitle}>{t('ContactUs')}</AppText>
          </View>
          <AppText style={styles.paragraph}>{t('PrivacyContactMessage')}</AppText>
          <TouchableOpacity
            style={styles.contactButton}
            activeOpacity={0.85}
            onPress={() => Linking.openURL(`mailto:${PRIVACY_CONTACT_EMAIL}`)}
          >
            <AppText style={styles.contactText}>{PRIVACY_CONTACT_EMAIL}</AppText>
            <Ionicons name="open-outline" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrivacyPolicyScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF7F5',
  },

  appHeader: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
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
  headerPlaceholder: {
    width: 42,
    height: 42,
  },

  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  updated: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray500,
    marginBottom: Spacing.sm,
  },
  intro: {
    fontSize: FontSize.md,
    color: Colors.black,
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },

  highlightCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 22,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  highlightText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.black,
    lineHeight: 20,
  },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EFE5E0',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F6EEE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  sectionTitle: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
  },
  paragraph: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    lineHeight: 21,
    marginBottom: Spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.xs,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 8,
    marginRight: Spacing.sm,
  },
  bulletText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray500,
    lineHeight: 21,
  },

  contactButton: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F6EEE8',
  },
  contactText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.primary,
  },
});
