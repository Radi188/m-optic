import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { selectIsAuthenticated } from '../store/slices/authSlice';
import { useHistory } from '../hook/useHistory';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../theme';
import type { Invoice, Refraction } from '../types/history';
import AppText from '../components/AppText';
import CurrentPrescriptionCard from '../components/ui/Profile/CurrentPrescriptionCard';

type Segment = 'refractions' | 'invoices';

/** Clearance for the custom tab bar, which floats over the list. */
const TAB_BAR_HEIGHT = 64;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso; // Show whatever the API sent.
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatMoney(value: number | null, currency: string): string | null {
  if (value === null) return null;
  return `${currency}${value.toFixed(2)}`;
}

/** Maps a free-text status onto the palette's semantic colours. */
function statusColors(status: string | null): { bg: string; fg: string } {
  const s = (status ?? '').toLowerCase();
  if (/paid|complete|success/.test(s)) {
    return { bg: Colors.successLight, fg: Colors.success };
  }
  if (/pending|partial|due/.test(s)) {
    return { bg: Colors.warningLight, fg: Colors.warning };
  }
  if (/cancel|void|refund|unpaid/.test(s)) {
    return { bg: Colors.errorLight, fg: Colors.error };
  }
  return { bg: Colors.gray100, fg: Colors.gray600 };
}

// ─── Rows ────────────────────────────────────────────────────────────────────

const RefractionCard: React.FC<{ item: Refraction; locale: string }> = ({
  item,
  locale,
}) => {
  const { t } = useTranslation();
  const date = formatDate(item.date, locale);

  // "ADD +2.00 · PD 62 · Dr Sok · Toul Kork" — only the parts that exist.
  const meta = [
    item.add ? `${t('Add')} ${item.add}` : null,
    item.pd ? `${t('Pd')} ${item.pd}` : null,
    item.doctor,
    item.branch,
  ]
    .filter(Boolean)
    .join('  ·  ');

  // The card falls back to a placeholder date of its own, so only turn the
  // date on when this row actually carries one.
  return (
    <View style={styles.cardSpacer}>
      <CurrentPrescriptionCard
        title={t('EyeExam')}
        rightLabel={t('RightEye')}
        leftLabel={t('LeftEye')}
        rightEye={item.right.sph ?? '—'}
        leftEye={item.left.sph ?? '—'}
        updatedAt={date ?? undefined}
        showDate={!!date}
        meta={meta || undefined}
        note={item.isEmpty ? t('NoReadingRecorded') : item.note ?? undefined}
      />
    </View>
  );
};

const InvoiceCard: React.FC<{ item: Invoice; locale: string }> = ({
  item,
  locale,
}) => {
  const { t } = useTranslation();
  const date = formatDate(item.date, locale);
  const total = formatMoney(item.total, item.currency);
  const badge = statusColors(item.status);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconCircle}>
          <Ionicons name="receipt-outline" size={18} color={Colors.primary} />
        </View>

        <View style={styles.cardHeaderText}>
          <AppText style={styles.cardTitle}>
            {item.number ? `#${item.number}` : t('Invoice')}
          </AppText>
          {date && <AppText style={styles.cardSubtitle}>{date}</AppText>}
        </View>

        {item.status && (
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <AppText style={[styles.badgeText, { color: badge.fg }]}>
              {item.status}
            </AppText>
          </View>
        )}
      </View>

      {item.items.map(line => (
        <View key={line.id} style={styles.lineRow}>
          <AppText style={styles.lineName} numberOfLines={1}>
            {line.quantity ? `${line.quantity} × ${line.name}` : line.name}
          </AppText>
          {line.total !== null && (
            <AppText style={styles.lineTotal}>
              {formatMoney(line.total, item.currency)}
            </AppText>
          )}
        </View>
      ))}

      {total && (
        <View style={styles.totalRow}>
          <AppText style={styles.totalLabel}>{t('Total')}</AppText>
          <AppText style={styles.totalValue}>{total}</AppText>
        </View>
      )}

      {item.branch && <AppText style={styles.footNote}>{item.branch}</AppText>}
    </View>
  );
};

// ─── Screen ──────────────────────────────────────────────────────────────────

const HistoryScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [segment, setSegment] = useState<Segment>('refractions');
  const { history, isLoading, isRefreshing, error, refetch } =
    useHistory(isAuthenticated);

  const locale = i18n.language === 'kh' ? 'km-KH' : 'en-GB';

  const data = useMemo(
    () =>
      segment === 'refractions'
        ? history?.refractions ?? []
        : history?.invoices ?? [],
    [history, segment],
  );

  const header = (
    <View style={styles.headerBlock}>
      <AppText style={styles.screenTitle}>{t('History')}</AppText>
      <AppText style={styles.screenSubtitle}>{t('HistorySubtitle')}</AppText>

      <View style={styles.segmentBar}>
        {(['refractions', 'invoices'] as Segment[]).map(key => {
          const active = segment === key;
          const count =
            key === 'refractions'
              ? history?.refractions.length ?? 0
              : history?.invoices.length ?? 0;

          return (
            <TouchableOpacity
              key={key}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => setSegment(key)}
              activeOpacity={0.8}
            >
              <AppText
                style={[
                  styles.segmentText,
                  active ? styles.segmentTextActive : styles.segmentTextInactive,
                ]}
              >
                {key === 'refractions'
                  ? t('Refractions')
                  : t('Invoices')}
                {count > 0 ? ` (${count})` : ''}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // Signed out — the endpoint needs a token, so ask before spinning.
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {header}
        <View style={styles.centerState}>
          <View style={styles.stateIcon}>
            <Ionicons name="lock-closed-outline" size={26} color={Colors.gray500} />
          </View>
          <AppText style={styles.stateTitle}>{t('SignInToSeeHistory')}</AppText>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <AppText style={styles.primaryBtnText}>{t('Login')}</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {header}
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <AppText style={styles.stateText}>{t('LoadingHistory')}</AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {header}
        <View style={styles.centerState}>
          <View style={styles.stateIcon}>
            <Ionicons name="alert-circle-outline" size={26} color={Colors.error} />
          </View>
          <AppText style={styles.stateTitle}>{t('CouldNotLoadHistory')}</AppText>
          <AppText style={styles.stateText}>{error}</AppText>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={refetch}
            activeOpacity={0.85}
          >
            <AppText style={styles.primaryBtnText}>{t('TryAgain')}</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FlatList
        data={data as (Refraction | Invoice)[]}
        keyExtractor={item => item.id}
        ListHeaderComponent={header}
        renderItem={({ item }) =>
          segment === 'refractions' ? (
            <RefractionCard item={item as Refraction} locale={locale} />
          ) : (
            <InvoiceCard item={item as Invoice} locale={locale} />
          )
        }
        contentContainerStyle={[
          styles.listContent,
          data.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={
          <View style={styles.centerState}>
            <View style={styles.stateIcon}>
              <Ionicons
                name={
                  segment === 'refractions' ? 'eye-outline' : 'receipt-outline'
                }
                size={26}
                color={Colors.gray500}
              />
            </View>
            <AppText style={styles.stateTitle}>
              {segment === 'refractions'
                ? t('NoRefractionsYet')
                : t('NoInvoicesYet')}
            </AppText>
            <AppText style={styles.stateText}>
              {segment === 'refractions'
                ? t('NoRefractionsHint')
                : t('NoInvoicesHint')}
            </AppText>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refetch}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

export default HistoryScreen;

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

  headerBlock: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  screenTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    marginTop: 2,
    marginBottom: Spacing.md,
  },

  segmentBar: {
    flexDirection: 'row',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.full,
    padding: 4,
  },
  segment: {
    flex: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  segmentText: { fontSize: FontSize.sm, fontWeight: '700' },
  segmentTextActive: { color: Colors.black },
  segmentTextInactive: { color: Colors.gray500 },

  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: TAB_BAR_HEIGHT + Spacing.xl,
  },
  listContentEmpty: { flexGrow: 1 },

  cardSpacer: { marginBottom: Spacing.md },

  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: { flex: 1 },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.black,
  },
  cardSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    marginTop: 1,
  },

  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  footNote: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    marginTop: Spacing.sm,
  },

  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 5,
  },
  lineName: { flex: 1, fontSize: FontSize.sm, color: Colors.gray700 },
  lineTotal: { fontSize: FontSize.sm, color: Colors.gray700, fontWeight: '600' },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  totalLabel: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: FontSize.lg,
    color: Colors.black,
    fontWeight: '800',
  },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: TAB_BAR_HEIGHT,
    gap: Spacing.sm,
  },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  stateTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.black,
    textAlign: 'center',
  },
  stateText: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 13,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  primaryBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },
});
