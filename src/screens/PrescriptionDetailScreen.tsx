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

import LinearGradient from 'react-native-linear-gradient';

import { Colors, FontSize, Spacing } from '../theme';
import { splitCombinedEye } from '../types/history';
import { useUserProfile } from '../hook/useUserProfile';
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
          {/* Hero. Same dark-and-gold treatment as the prescription card on
              the profile tab, so opening one leads into the other. */}
          <View style={styles.heroCard}>
            <LinearGradient
              colors={['#5A4232', '#3A2A20']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View pointerEvents="none" style={styles.heroSheen} />

            <View style={styles.heroHead}>
              <View style={styles.heroIconBox}>
                <Ionicons name="eye-outline" size={18} color={GOLD} />
              </View>

              <View style={styles.heroHeadText}>
                <AppText style={styles.heroTitle}>
                  {t('CurrentPrescription')}
                </AppText>
                <AppText style={styles.heroSubtitle}>
                  {`${t('LastUpdated')} · ${formatDate(
                    prescription?.created_at,
                    t,
                    locale,
                  )}`}
                </AppText>
              </View>
            </View>

            <View style={styles.eyeRow}>
              <EyeSummary
                label={t('RightEye')}
                value={formatValue(prescription?.right_eye)}
              />

              <View style={styles.divider} />

              <EyeSummary
                label={t('LeftEye')}
                value={formatValue(prescription?.left_eye)}
              />
            </View>
          </View>

          {prescription ? (
            <>
              {/* ADD and PD are single figures that belong beside each other,
                  not as two more rows in a list. */}
              <View style={styles.chipRow}>
                <Chip
                  label="ADD"
                  value={formatValue(prescription.add)}
                  icon="add-circle-outline"
                />
                <Chip
                  label="PD"
                  value={formatValue(prescription.pd)}
                  icon="scan-outline"
                />
              </View>

              <AppText style={styles.sectionLabel}>
                {t('PrescriptionDetails')}
              </AppText>

              {/* A real prescription is a table: sphere, cylinder and axis per
                  eye. The API sends them combined ("-3.50/-2.25"), which the
                  old list printed raw into a single "Right Eye" row. */}
              <View style={styles.tableCard}>
                <View style={styles.tableHeadRow}>
                  <AppText style={[styles.tableHead, styles.colEye]} />
                  <AppText style={[styles.tableHead, styles.colValue]}>
                    SPH
                  </AppText>
                  <AppText style={[styles.tableHead, styles.colValue]}>
                    CYL
                  </AppText>
                  <AppText style={[styles.tableHead, styles.colValue]}>
                    AXIS
                  </AppText>
                </View>

                <RxRow
                  label={t('RightEye')}
                  reading={splitCombinedEye(prescription.right_eye ?? '')}
                />
                <RxRow
                  label={t('LeftEye')}
                  reading={splitCombinedEye(prescription.left_eye ?? '')}
                  isLast
                />
              </View>

              <AppText style={styles.tableFootnote}>
                {`${t('LastUpdated')}: ${formatDateTime(
                  prescription.created_at,
                  t,
                  locale,
                )}`}
              </AppText>

              <View style={styles.noteCard}>
                <View style={styles.noteIconBox}>
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
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

const GOLD = '#E3B778';

/** One eye in the hero: label, then the combined reading. */
const EyeSummary: React.FC<{
  label: string;
  value: string;
}> = ({ label, value }) => (
  <View style={styles.eyeBlock}>
    <AppText style={styles.eyeLabel} numberOfLines={1}>
      {label}
    </AppText>

    {/* Readings can be a full sphere/cylinder string, so the type shrinks to
        fit rather than wrapping or truncating. */}
    <AppText
      style={styles.eyeValue}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.5}
    >
      {value}
    </AppText>
  </View>
);

const Chip: React.FC<{ label: string; value: string; icon: string }> = ({
  label,
  value,
  icon,
}) => (
  <View style={styles.chip}>
    <View style={styles.chipIcon}>
      <Ionicons name={icon as any} size={15} color="#9B6A3D" />
    </View>
    <View style={styles.chipText}>
      <AppText style={styles.chipLabel}>{label}</AppText>
      <AppText style={styles.chipValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
    </View>
  </View>
);

/** One row of the Rx table: the eye, then sphere, cylinder and axis. */
const RxRow: React.FC<{
  label: string;
  reading: { sph: string | null; cyl: string | null; axis: string | null };
  isLast?: boolean;
}> = ({ label, reading, isLast = false }) => (
  <View style={[styles.tableRow, isLast && styles.tableRowLast]}>
    <View style={[styles.colEye, styles.eyeCell]}>
      <AppText style={styles.rowLabel} numberOfLines={2}>
        {label}
      </AppText>
    </View>

    <AppText style={[styles.tableValue, styles.colValue]}>
      {formatValue(reading.sph)}
    </AppText>
    <AppText style={[styles.tableValue, styles.colValue]}>
      {formatValue(reading.cyl)}
    </AppText>
    <AppText style={[styles.tableValue, styles.colValue]}>
      {formatValue(reading.axis)}
    </AppText>
  </View>
);

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

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroCard: {
    marginTop: Spacing.sm,
    borderRadius: 22,
    padding: 18,
    overflow: 'hidden',
    backgroundColor: '#3A2A20',
    borderWidth: 1,
    borderColor: 'rgba(227,183,120,0.16)',
  },

  heroSheen: {
    position: 'absolute',
    top: -130,
    right: -100,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,226,182,0.10)',
    transform: [{ rotate: '18deg' }],
  },

  heroHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },

  heroIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(227,183,120,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(227,183,120,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroHeadText: { flex: 1 },

  heroTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },

  heroSubtitle: {
    marginTop: 3,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.58)',
  },

  eyeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingVertical: 16,
    paddingHorizontal: 10,
  },

  eyeBlock: {
    flex: 1,
    alignItems: 'center',
  },

  eyeLabel: {
    alignSelf: 'stretch',
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '800',
    color: GOLD,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  eyeValue: {
    alignSelf: 'stretch',
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.6,
  },

  divider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  // ── ADD / PD chips ────────────────────────────────────────────────────────
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },

  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0E7E1',
    paddingVertical: 11,
    paddingHorizontal: 12,
  },

  chipIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FBF1E8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  chipText: { flex: 1 },

  chipLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A2938B',
    letterSpacing: 0.8,
  },

  chipValue: {
    marginTop: 1,
    fontSize: 15,
    fontWeight: '900',
    color: '#1A1310',
  },

  // ── Rx table ──────────────────────────────────────────────────────────────
  sectionLabel: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '900',
    color: '#9A8B82',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  tableCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0E7E1',
    overflow: 'hidden',
  },

  tableHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: '#FBF7F4',
    borderBottomWidth: 1,
    borderBottomColor: '#F3EAE3',
  },

  tableHead: {
    fontSize: 10,
    fontWeight: '900',
    color: '#A2938B',
    letterSpacing: 0.8,
    textAlign: 'center',
  },

  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EAE3',
  },

  tableRowLast: { borderBottomWidth: 0 },

  // The eye column is wider: it carries a marker and a translated label,
  // while the three value columns hold short numbers.
  colEye: { flex: 1.5 },
  colValue: { flex: 1 },

  eyeCell: { justifyContent: 'center' },

  rowLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#241812',
  },

  tableValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1310',
    textAlign: 'center',
  },

  tableFootnote: {
    marginTop: 8,
    marginLeft: 4,
    fontSize: 11.5,
    color: '#A2938B',
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
