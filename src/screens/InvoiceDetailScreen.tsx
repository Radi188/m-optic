import React from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { BorderRadius, Colors, FontSize, Shadow, Spacing, Layout } from '../theme';
import { useBlockScreenCapture } from '../hook/useBlockScreenCapture';
import { invoiceSavings } from '../types/history';
import type { Invoice, InvoiceItem } from '../types/history';
import AppText from '../components/AppText';
import AppImage from '../components/AppImage';
import { eventColors } from '../utils/invoiceEvent';
import { formatPrice } from '../utils/formatPrice';

/**
 * The full receipt behind a row in History › Invoices.
 *
 * The invoice arrives on the route params rather than being refetched: the
 * history endpoint already returns every line item and its branch, so there is
 * nothing further to ask the API for.
 */
const InvoiceDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t, i18n } = useTranslation();
  // Shows prices: no screenshots or screen recording while focused.
  useBlockScreenCapture();

  const invoice: Invoice | undefined = route.params?.invoice;
  const locale = i18n.language === 'km' ? 'km-KH' : 'en-GB';

  const money = (value: number | null) =>
    value === null
      ? null
      : formatPrice(value, { currency: invoice?.currency ?? '$', decimals: 2 });

  const eventTint = eventColors(invoice?.event ?? null);
  const savings = invoice ? invoiceSavings(invoice) : null;

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.85}
      >
        <Ionicons name="chevron-back" size={24} color={Colors.black} />
      </TouchableOpacity>

      <AppText style={styles.headerTitle} numberOfLines={1}>
        {t('InvoiceDetails')}
      </AppText>
    </View>
  );

  if (!invoice) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {header}
        <View style={styles.centerState}>
          <AppText style={styles.stateTitle}>{t('InvoiceNotFound')}</AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {header}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount first: it is the one number the customer opens this for. */}
        <View style={styles.heroCard}>
          <AppText style={styles.heroLabel}>{t('Total')}</AppText>
          {/* Full price struck through above what was actually paid. */}
          {savings && (
            <AppText style={styles.heroOriginal}>
              {money(savings.fullPrice)}
            </AppText>
          )}
          <AppText style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>
            {money(invoice.total) ?? '—'}
          </AppText>

          {invoice.totalKhr !== null && (
            <AppText style={styles.heroSecondary}>
              ៛{invoice.totalKhr.toLocaleString(locale)}
            </AppText>
          )}

          {savings && (
            <View style={styles.savedPill}>
              <Ionicons name="pricetag" size={13} color={Colors.success} />
              <AppText style={styles.savedPillText}>
                {t('YouSaved', { amount: money(savings.discount) })}
                {savings.percent > 0 ? ` (-${savings.percent}%)` : ''}
              </AppText>
            </View>
          )}

          {!!invoice.event && (
            <View style={styles.heroBadges}>
              <View
                style={[styles.heroBadge, { backgroundColor: eventTint.bg }]}
              >
                <AppText
                  style={[styles.heroBadgeText, { color: eventTint.fg }]}
                >
                  {t(invoice.event)}
                </AppText>
              </View>
            </View>
          )}
        </View>

        {/* ── Items ── */}
        <AppText style={styles.sectionLabel}>
          {t('Items')} ({invoice.items.length})
        </AppText>

        <View style={styles.card}>
          {invoice.items.length === 0 ? (
            <AppText style={styles.emptyItems}>{t('NoItems')}</AppText>
          ) : (
            invoice.items.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                currency={invoice.currency}
                isLast={index === invoice.items.length - 1}
              />
            ))
          )}
        </View>

        {/* ── Payment summary ── */}
        <AppText style={styles.sectionLabel}>{t('Summary')}</AppText>

        <View style={styles.card}>
          {savings ? (
            <>
              <SummaryRow
                label={t('FullPrice')}
                value={money(savings.fullPrice)}
              />
              <SummaryRow
                label={
                  savings.percent > 0
                    ? `${t('Discount')} (-${savings.percent}%)`
                    : t('Discount')
                }
                value={`-${money(savings.discount)}`}
                highlight
              />
            </>
          ) : (
            <SummaryRow label={t('Subtotal')} value={money(invoice.subtotal)} />
          )}
          <SummaryRow
            label={t('GrandTotal')}
            value={money(invoice.total)}
            emphasis
            isLast
          />
        </View>

        {/* ── Receipt details ── */}
        <AppText style={styles.sectionLabel}>{t('Details')}</AppText>

        <View style={styles.card}>
          <DetailRow
            icon="pricetag-outline"
            label={t('InvoiceReference')}
            value={invoice.number}
          />
          <DetailRow
            icon="calendar-outline"
            label={t('Date')}
            value={formatDateTime(invoice.date, locale)}
          />
          <DetailRow
            icon="card-outline"
            label={t('PaymentMethod')}
            value={invoice.paymentMethod}
          />
          <DetailRow
            icon="swap-horizontal-outline"
            label={t('ExchangeRate')}
            value={
              invoice.exchangeRate
                ? `1 $ = ៛${invoice.exchangeRate.toLocaleString(locale)}`
                : null
            }
          />
          <DetailRow
            icon="list-outline"
            label={t('QueueNumber')}
            value={invoice.queueNumber}
          />
          <DetailRow
            icon="storefront-outline"
            label={t('Branch')}
            value={invoice.branch}
          />
          <DetailRow
            icon="location-outline"
            label={t('Address')}
            value={invoice.branchAddress}
          />
          <DetailRow
            icon="call-outline"
            label={t('PhoneNumber')}
            value={invoice.branchPhone}
            isLast={!invoice.note}
          />
          {!!invoice.note && (
            <DetailRow
              icon="document-text-outline"
              label={t('Note')}
              value={invoice.note}
              isLast
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Rows ────────────────────────────────────────────────────────────────────

const ItemRow: React.FC<{
  item: InvoiceItem;
  currency: string;
  isLast: boolean;
}> = ({ item, currency, isLast }) => {
  const { t } = useTranslation();

  return (
    <View style={[styles.itemRow, isLast && styles.rowLast]}>
      {item.image ? (
        <View style={styles.itemImageBox}>
          <AppImage
            source={{ uri: item.image }}
            style={styles.itemImage}
            resizeMode="contain"
          />
        </View>
      ) : (
        <View style={[styles.itemImageBox, styles.itemImageFallback]}>
          <Ionicons name="glasses-outline" size={22} color={Colors.gray400} />
        </View>
      )}

      <View style={styles.itemText}>
        <AppText style={styles.itemName} numberOfLines={1}>
          {item.name}
        </AppText>
        <AppText style={styles.itemMeta} numberOfLines={1}>
          {[item.productType, item.code].filter(Boolean).join('  ·  ')}
        </AppText>
        {item.quantity !== null && (
          <AppText style={styles.itemMeta}>
            {t('Qty')} {item.quantity}
            {item.unitPrice !== null
              ? `  ·  ${formatPrice(item.unitPrice, { currency, decimals: 2 })}`
              : ''}
          </AppText>
        )}
      </View>

      {item.total !== null && (
        <View style={styles.itemPrice}>
          {/* Discounted line: full price struck through, then what was paid. */}
          {item.originalTotal !== null && (
            <AppText style={styles.itemOriginal}>
              {formatPrice(item.originalTotal, { currency, decimals: 2 })}
            </AppText>
          )}
          <AppText style={styles.itemTotal}>
            {formatPrice(item.total, { currency, decimals: 2 })}
          </AppText>
          {item.originalTotal !== null && item.discount !== null && (
            <AppText style={styles.itemDiscount}>
              -{formatPrice(item.discount, { currency, decimals: 2 })}
            </AppText>
          )}
        </View>
      )}
    </View>
  );
};

const SummaryRow: React.FC<{
  label: string;
  value: string | null;
  emphasis?: boolean;
  /** Green value, for the discount line. */
  highlight?: boolean;
  isLast?: boolean;
}> = ({ label, value, emphasis = false, highlight = false, isLast = false }) => (
  <View style={[styles.summaryRow, isLast && styles.rowLast]}>
    <AppText style={[styles.summaryLabel, emphasis && styles.summaryLabelBold]}>
      {label}
    </AppText>
    <AppText
      style={[
        styles.summaryValue,
        emphasis && styles.summaryValueBold,
        highlight && styles.summaryValueSaving,
      ]}
    >
      {value ?? '—'}
    </AppText>
  </View>
);

const DetailRow: React.FC<{
  icon: string;
  label: string;
  value: string | null;
  isLast?: boolean;
}> = ({ icon, label, value, isLast = false }) => {
  // A receipt field the backend left blank tells the customer nothing, so the
  // row is dropped rather than rendered as a dash.
  if (!value) return null;

  return (
    <View style={[styles.detailRow, isLast && styles.rowLast]}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon as any} size={17} color={Colors.primary} />
      </View>

      <AppText style={styles.detailLabel}>{label}</AppText>

      <AppText style={styles.detailValue} numberOfLines={2}>
        {value}
      </AppText>
    </View>
  );
};

function formatDateTime(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  // "2026-09-03 15:27:44" is not parsed on every JS engine — ISO-ise it.
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default InvoiceDetailScreen;

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

  header: {
    ...Layout.readable,
    minHeight: 60,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.black,
  },

  content: {
    ...Layout.readable,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    ...Shadow.sm,
  },
  heroLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroValue: {
    alignSelf: 'stretch',
    marginTop: 6,
    fontSize: 38,
    fontWeight: '800',
    color: Colors.black,
    textAlign: 'center',
    letterSpacing: -1,
  },
  heroSecondary: {
    marginTop: 2,
    fontSize: FontSize.sm,
    color: Colors.gray500,
  },
  heroOriginal: {
    marginTop: 6,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.gray400,
    textDecorationLine: 'line-through',
  },
  savedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.successLight,
  },
  savedPillText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.success,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  heroBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
  },
  heroBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray600,
    textTransform: 'capitalize',
  },

  sectionLabel: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    marginLeft: 4,
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    ...Shadow.sm,
  },

  rowLast: { borderBottomWidth: 0 },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  itemImageBox: {
    width: 88,
    height: 66,
    borderRadius: BorderRadius.md,
    // White, not gray: product shots are cut-outs on white, and a grey well
    // leaves a visible square of background around the frame.
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    overflow: 'hidden',
  },
  itemImage: { width: '100%', height: '100%' },
  itemImageFallback: { alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, gap: 2 },
  itemName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.black,
  },
  itemMeta: { fontSize: FontSize.xs, color: Colors.gray500 },
  itemPrice: { alignItems: 'flex-end', gap: 1 },
  itemOriginal: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    textDecorationLine: 'line-through',
  },
  itemTotal: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
  },
  itemDiscount: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.success,
  },
  emptyItems: {
    paddingVertical: Spacing.lg,
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: Colors.gray500,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  summaryLabel: { fontSize: FontSize.sm, color: Colors.gray500 },
  summaryLabelBold: {
    fontWeight: '700',
    color: Colors.black,
  },
  summaryValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.gray700,
  },
  summaryValueBold: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.black,
  },
  summaryValueSaving: { color: Colors.success },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: { fontSize: FontSize.sm, color: Colors.gray500 },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.black,
  },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  stateTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.black,
    textAlign: 'center',
  },
});
