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
import { Colors, FontSize, Spacing, Layout } from '../theme';
import AppText from '../components/AppText';
import { formatDate } from '../utils/dateHelper';
import type { PolicySection } from '../content/privacyPolicy';
import {
  getTermsAndConditions,
  BUSINESS_NAME,
  TERMS_LAST_UPDATED,
  TERMS_WEBSITE_LABEL,
  TERMS_WEBSITE_URL,
} from '../content/termsAndConditions';

const TermsSectionCard = ({ section }: { section: PolicySection }) => (
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

const TermsAndConditionsScreen = () => {
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const terms = getTermsAndConditions(
    i18n.resolvedLanguage === 'km' ? 'km' : 'en',
  );

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
          <AppText style={styles.headerTitle}>
            {t('TermsAndConditions')}
          </AppText>
          <AppText style={styles.headerSubtitle}>{t('TermsOfUse')}</AppText>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <AppText style={styles.updated}>
          {t('LastUpdated')}: {formatDate(TERMS_LAST_UPDATED)}
        </AppText>

        <AppText style={styles.intro}>{terms.intro}</AppText>

        {/* Registered business details, as on the tax registration certificate */}
        {/* <View style={styles.businessCard}>
          <View style={styles.businessHeader}>
            <View style={styles.businessBadge}>
              <Ionicons name="ribbon-outline" size={22} color={Colors.white} />
            </View>
            <View style={styles.businessHeaderText}>
              <AppText style={styles.businessCaption}>
                {t('OperatedBy')}
              </AppText>
              <AppText style={styles.businessName}>{BUSINESS_NAME}</AppText>
            </View>
            <View style={styles.verifiedPill}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={Colors.primary}
              />
              <AppText style={styles.verifiedText}>{t('Registered')}</AppText>
            </View>
          </View>

          <View style={styles.businessDivider} />

          {terms.business.map(row => (
            <View key={row.icon} style={styles.businessRow}>
              <Ionicons
                name={row.icon as any}
                size={17}
                color={Colors.primary}
              />
              <View style={styles.businessRowText}>
                <AppText style={styles.businessLabel}>{row.label}</AppText>
                <AppText style={styles.businessValue}>{row.value}</AppText>
              </View>
            </View>
          ))}
        </View> */}

        {terms.sections.map(section => (
          <TermsSectionCard key={section.id} section={section} />
        ))}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="globe-outline" size={19} color={Colors.primary} />
            </View>
            <AppText style={styles.sectionTitle}>{t('ContactUs')}</AppText>
          </View>
          <AppText style={styles.paragraph}>{t('TermsContactMessage')}</AppText>
          <TouchableOpacity
            style={styles.contactButton}
            activeOpacity={0.85}
            onPress={() => Linking.openURL(TERMS_WEBSITE_URL)}
          >
            <AppText style={styles.contactText}>{TERMS_WEBSITE_LABEL}</AppText>
            <Ionicons name="open-outline" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TermsAndConditionsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF7F5',
  },

  appHeader: {
    ...Layout.readable,
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
    ...Layout.readable,
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

  businessCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 22,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  businessHeaderText: {
    flex: 1,
  },
  businessCaption: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray500,
  },
  businessName: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.black,
    letterSpacing: -0.2,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  businessDivider: {
    height: 1,
    backgroundColor: Colors.primary + '22',
    marginVertical: Spacing.md,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  businessRowText: {
    flex: 1,
  },
  businessLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray500,
  },
  businessValue: {
    marginTop: 1,
    fontSize: FontSize.sm,
    fontWeight: '700',
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
