import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { Colors, FontSize, Spacing } from '../theme';
import { useUserProfile } from '../hook/useUserProfile';
import CurrentPrescriptionCard from '../components/ui/Profile/CurrentPrescriptionCard';
import PrescriptionSkeleton from '../components/ui/Loading/PrescriptionLoadingScreen';
import AppText from '../components/AppText';

const PrescriptionDetailScreen = () => {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const { profile, isLoading, isRefreshing, error, refetch } = useUserProfile();

  const prescription = profile?.prescription;
  const locale = i18n.language === 'km' ? 'km-KH' : 'en-GB';

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <PrescriptionSkeleton />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centerState}>
          <View style={styles.errorIconBox}>
            <Ionicons name="alert-circle-outline" size={30} color="#D92D20" />
          </View>

          <AppText style={styles.errorTitle}>
            {t('UnableToLoadPrescription')}
          </AppText>
          <AppText style={styles.errorText}>
            {error || t('SomethingWentWrongTryAgain')}
          </AppText>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.retryButton}
            onPress={refetch}
          >
            <AppText style={styles.retryButtonText}>{t('TryAgain')}</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#241812" />
          </TouchableOpacity>

          <AppText style={styles.headerTitle}>{t('Prescription')}</AppText>

          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refetch} />
          }
        >
          <CurrentPrescriptionCard
            rightEye={profile?.prescription?.right_eye}
            leftEye={profile?.prescription?.left_eye}
            updatedAt={formatDate(profile?.prescription?.created_at, t, locale)}
            onPress={() => navigation.navigate('PrescriptionDetail')}
            leftLabel={t('LeftEye')}
            rightLabel={t('RightEye')}
            title={t('CurrentPrescription')}
          />

          {prescription ? (
            <>
              <AppText style={styles.sectionLabel}>
                {t('PrescriptionDetails')}
              </AppText>

              <View style={styles.detailCard}>
                <PrescriptionRow
                  label={t('RightEye')}
                  value={prescription.right_eye}
                  icon="eye-outline"
                />

                <PrescriptionRow
                  label={t('LeftEye')}
                  value={prescription.left_eye}
                  icon="eye-outline"
                />

                <PrescriptionRow
                  label="ADD"
                  value={prescription.add}
                  icon="add-circle-outline"
                />

                <PrescriptionRow
                  label="PD"
                  value={prescription.pd}
                  icon="scan-outline"
                />

                <PrescriptionRow
                  label={t('LastUpdated')}
                  value={formatDateTime(prescription.created_at, t, locale)}
                  icon="calendar-outline"
                  isLast
                />
              </View>

              <View style={styles.noteCard}>
                <View style={styles.noteIconBox}>
                  <Ionicons
                    name="information-circle-outline"
                    size={22}
                    color="#9B6A3D"
                  />
                </View>

                <View style={styles.noteTextBox}>
                  <AppText style={styles.noteTitle}>
                    {t('ImportantNote')}
                  </AppText>
                  <AppText style={styles.noteText}>
                    {t('PrescriptionConfirmNote')}
                  </AppText>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconBox}>
                <Ionicons
                  name="document-text-outline"
                  size={34}
                  color="#9B6A3D"
                />
              </View>

              <AppText style={styles.emptyTitle}>
                {t('NoPrescriptionYet')}
              </AppText>
              <AppText style={styles.emptyText}>
                {t('PrescriptionEmptyMessage')}
              </AppText>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

type PrescriptionRowProps = {
  label: string;
  value?: string | number | null;
  icon: string;
  isLast?: boolean;
};

const PrescriptionRow: React.FC<PrescriptionRowProps> = ({
  label,
  value,
  icon,
  isLast = false,
}) => {
  return (
    <View style={[styles.detailRow, isLast && styles.detailRowLast]}>
      <View style={styles.detailLeft}>
        <View style={styles.detailIconBox}>
          <Ionicons name={icon as any} size={19} color="#9B6A3D" />
        </View>

        <AppText style={styles.detailLabel}>{label}</AppText>
      </View>

      <AppText style={styles.detailValue}>{formatValue(value)}</AppText>
    </View>
  );
};

const formatValue = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') {
    return '--';
  }

  return String(value);
};

const formatDate = (
  dateString: string | null | undefined,
  t: any,
  locale: string,
) => {
  if (!dateString) return t('NotProvided');

  const date = new Date(dateString);

  if (isNaN(date.getTime())) return t('InvalidDate');

  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (
  dateString: string | null | undefined,
  t: any,
  locale: string,
) => {
  if (!dateString) return t('NotProvided');

  const date = new Date(dateString);

  if (isNaN(date.getTime())) return t('InvalidDate');

  return date.toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default PrescriptionDetailScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFDFB',
  },

  container: {
    flex: 1,
    backgroundColor: '#FFFDFB',
  },

  header: {
    minHeight: 74,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFE7E1',
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1F1712',
    letterSpacing: -0.3,
  },

  headerPlaceholder: {
    width: 48,
    height: 48,
  },

  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 120,
  },

  summaryCard: {
    marginTop: Spacing.sm,
    backgroundColor: '#F5ECE6',
    borderRadius: 32,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#EFE2DA',
  },

  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  summaryIconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#EBE0D7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },

  summaryTextBox: {
    flex: 1,
  },

  summaryTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A1310',
    letterSpacing: -0.5,
  },

  summarySubtitle: {
    marginTop: 5,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#8A7A71',
  },

  eyeRow: {
    marginTop: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  eyeBlock: {
    flex: 1,
  },

  eyeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8A7A71',
    marginBottom: 8,
  },

  eyeValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#1A1310',
    letterSpacing: -0.8,
  },

  divider: {
    width: 1,
    height: 56,
    backgroundColor: '#E5D6CD',
    marginHorizontal: Spacing.lg,
    marginTop: 8,
  },

  sectionLabel: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '900',
    color: '#9A8B82',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#EFE5DD',
    overflow: 'hidden',
  },

  detailRow: {
    minHeight: 74,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1EAE5',
  },

  detailRowLast: {
    borderBottomWidth: 0,
  },

  detailLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  detailIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FBF1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },

  detailLabel: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: '#241812',
  },

  detailValue: {
    maxWidth: 170,
    textAlign: 'right',
    fontSize: FontSize.md,
    fontWeight: '900',
    color: '#1A1310',
  },

  noteCard: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    backgroundColor: '#FFF8F0',
    borderRadius: 24,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#F2DEC7',
  },

  noteIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7E7D6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },

  noteTextBox: {
    flex: 1,
  },

  noteTitle: {
    fontSize: FontSize.md,
    fontWeight: '900',
    color: '#241812',
  },

  noteText: {
    marginTop: 5,
    fontSize: FontSize.sm,
    lineHeight: 20,
    fontWeight: '600',
    color: '#7A604F',
  },

  emptyCard: {
    marginTop: Spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFE5DD',
  },

  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FBF1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: '#241812',
  },

  emptyText: {
    marginTop: 6,
    fontSize: FontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    color: '#8B7C72',
  },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },

  centerText: {
    marginTop: 14,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.gray500,
  },

  errorIconBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FEE4E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  errorTitle: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.black,
  },

  errorText: {
    marginTop: 8,
    fontSize: FontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    color: Colors.gray500,
  },

  retryButton: {
    marginTop: 18,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  retryButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '900',
    color: Colors.white,
  },
});
