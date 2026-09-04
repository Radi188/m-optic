import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTranslation } from 'react-i18next';

import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../../theme';
import { LENS_CATEGORIES, localize } from '../../../types/lens';
import type { LensProduct, LensTier } from '../../../types/lens';
import AppText from '../../AppText';
import BlueBlockDemo from './BlueBlockDemo';
import ThicknessDemo from './ThicknessDemo';
import PhotochromicDemo from './PhotochromicDemo';
import ZoneMapDemo from './ZoneMapDemo';

const money = (v: number) => `$${v.toFixed(2)}`;

/** One price band: its SPH/CYL range on the left, the price on the right. */
const TierRow: React.FC<{ tier: LensTier }> = ({ tier }) => (
  <View style={styles.tierRow}>
    <View style={styles.tierRange}>
      <AppText style={styles.rangeText}>
        {`SPH: ${tier.sph}`}
        {!!tier.cyl && (
          <>
            <AppText style={styles.rangeDivider}>{'   |   '}</AppText>
            {`CYL: ${tier.cyl}`}
          </>
        )}
        {!!tier.add && (
          <>
            <AppText style={styles.rangeDivider}>{'   |   '}</AppText>
            {`ADD: ${tier.add}`}
          </>
        )}
      </AppText>
      {!!tier.note && (
        <AppText style={styles.rangeNote}>{tier.note}</AppText>
      )}
    </View>

    <View style={styles.tierPrice}>
      <AppText style={styles.price}>{money(tier.price)}</AppText>
      {tier.originalPrice !== undefined && (
        <AppText style={styles.priceWas}>{money(tier.originalPrice)}</AppText>
      )}
    </View>
  </View>
);

/**
 * The web table becomes a card per lens: a table with four columns cannot be
 * read on a phone, but each row is self-contained so it stacks cleanly.
 */
const LensCard: React.FC<{ product: LensProduct }> = ({ product }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <View style={styles.lensCard}>
      <AppText style={styles.lensName}>{product.name}</AppText>

      <View style={styles.coatingRow}>
        <View style={[styles.dot, { backgroundColor: product.coating.color }]} />
        <AppText style={styles.coatingLabel}>
          {localize(product.coating.label, lang)}
        </AppText>
      </View>

      <AppText style={styles.blockLabel}>{t('LensFeatures')}</AppText>
      {product.features.map((feature, i) => (
        <View key={`${product.id}-f${i}`} style={styles.featureRow}>
          <Ionicons
            name="checkmark-circle"
            size={14}
            color={Colors.primary}
            style={styles.featureIcon}
          />
          <AppText style={styles.featureText}>
            {localize(feature, lang)}
          </AppText>
        </View>
      ))}

      <AppText style={[styles.blockLabel, styles.blockLabelSpaced]}>
        {t('LensRangePrice')}
      </AppText>
      {product.tiers.map((tier, i) => (
        <TierRow key={`${product.id}-${i}`} tier={tier} />
      ))}
    </View>
  );
};

/**
 * Lens technology guide — the home screen's replacement for the frame-type
 * grid. One tab per lens family, each with its lens options and, where it
 * helps, an interactive demo of the technology.
 */
const LensTechSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [activeId, setActiveId] = useState(LENS_CATEGORIES[0].id);
  const [productId, setProductId] = useState<string | null>(null);

  const active = useMemo(
    () =>
      LENS_CATEGORIES.find(c => c.id === activeId) ?? LENS_CATEGORIES[0],
    [activeId],
  );

  // Falling back to the first product means switching category resets the
  // selection on its own — the stored id simply won't exist in the new list,
  // so there is no effect to keep in sync.
  const activeProduct = useMemo(
    () =>
      active.products.find(p => p.id === productId) ?? active.products[0],
    [active, productId],
  );

  return (
    <View style={styles.container}>
      <AppText style={styles.sectionTitle}>{t('LensGuideTitle')}</AppText>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
        style={styles.tabs}
      >
        {LENS_CATEGORIES.map(category => {
          const isActive = category.id === active.id;
          return (
            <TouchableOpacity
              key={category.id}
              onPress={() => setActiveId(category.id)}
              activeOpacity={0.75}
              style={styles.tab}
            >
              <AppText
                numberOfLines={1}
                style={[styles.tabText, isActive && styles.tabTextActive]}
              >
                {localize(category.name, lang)}
              </AppText>
              <View
                style={[
                  styles.tabUnderline,
                  isActive && styles.tabUnderlineActive,
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.body}>
        {/* Neither the title nor the subtitle is rendered here: the title is
            the selected tab's own label, and the description below it said the
            same thing again in longer form. The recommendation box is the
            first thing the tab has to add. */}
        {!!localize(active.recommendedFor, lang) && (
          <View style={styles.recommendBox}>
            <View style={styles.recommendIcon}>
              <Ionicons name="ribbon-outline" size={18} color="#5B3A26" />
            </View>
            <View style={styles.recommendText}>
              <AppText style={styles.recommendTitle}>
                {t('LensRecommendedFor')}
              </AppText>
              <AppText style={styles.recommendBody}>
                {localize(active.recommendedFor, lang)}
              </AppText>
            </View>
          </View>
        )}

        {active.demo === 'blueBlock' && <BlueBlockDemo />}
        {active.demo === 'thickness' && <ThicknessDemo />}
        {active.demo === 'photochromic' && <PhotochromicDemo />}
        {active.demo === 'zonesBifocal' && (
          <ZoneMapDemo zones={['far', 'near']} />
        )}
        {active.demo === 'zonesProgressive' && (
          <ZoneMapDemo zones={['far', 'mid', 'near']} />
        )}

        <AppText style={styles.optionsHeading}>{t('LensOptions')}</AppText>

        {active.products.length > 0 ? (
          <>
            {/* One chip per lens; only the selected card is shown, so a long
                catalogue stays scannable instead of becoming a long scroll. */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.optionTabsContent}
              style={styles.optionTabs}
            >
              {active.products.map(product => {
                const isActive = product.id === activeProduct?.id;
                return (
                  <TouchableOpacity
                    key={product.id}
                    onPress={() => setProductId(product.id)}
                    activeOpacity={0.8}
                    style={[
                      styles.optionTab,
                      isActive && styles.optionTabActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: product.coating.color },
                      ]}
                    />
                    <AppText
                      numberOfLines={1}
                      style={[
                        styles.optionTabText,
                        isActive && styles.optionTabTextActive,
                      ]}
                    >
                      {product.name}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {activeProduct && <LensCard product={activeProduct} />}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="layers-outline" size={26} color={Colors.gray400} />
            <AppText style={styles.emptyTitle}>{t('LensComingSoon')}</AppText>
            <AppText style={styles.emptyText}>{t('LensComingSoonHint')}</AppText>
          </View>
        )}

        {active.tips.length > 0 && (
          <View style={styles.tipsBox}>
            <AppText style={styles.tipsTitle}>{t('LensTips')}</AppText>
            {active.tips.map((tip, i) => (
              <View key={`tip-${i}`} style={styles.tipRow}>
                <View style={styles.tipBullet} />
                <AppText style={styles.tipText}>{localize(tip, lang)}</AppText>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

export default LensTechSection;

const styles = StyleSheet.create({
  container: { marginTop: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },

  tabs: { marginBottom: Spacing.md },
  tabsContent: { paddingHorizontal: Spacing.md },
  tab: { marginRight: Spacing.lg, maxWidth: 220 },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.gray500,
    paddingBottom: Spacing.sm,
  },
  tabTextActive: { color: Colors.black, fontWeight: '700' },
  tabUnderline: { height: 2, borderRadius: 1, backgroundColor: 'transparent' },
  tabUnderlineActive: { backgroundColor: Colors.primary },

  body: { paddingHorizontal: Spacing.md },

  recommendBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  recommendIcon: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#EBE0D7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendText: { flex: 1 },
  recommendTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.black,
  },
  recommendBody: {
    fontSize: FontSize.sm,
    color: Colors.gray600,
    lineHeight: 19,
    marginTop: 2,
  },

  optionsHeading: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.black,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  optionTabs: {
    marginBottom: Spacing.md,
    // Break out of the body padding so the row can scroll edge to edge.
    marginHorizontal: -Spacing.md,
  },
  optionTabsContent: { paddingHorizontal: Spacing.md },
  optionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 220,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginRight: Spacing.sm,
  },
  optionTabActive: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
    backgroundColor: Colors.primaryLight,
  },
  optionTabText: {
    flexShrink: 1,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.gray600,
  },
  optionTabTextActive: { color: Colors.primary, fontWeight: '700' },

  lensCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  lensName: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.black,
  },
  coatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  coatingLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: '600',
  },

  blockLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray400,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  blockLabelSpaced: { marginTop: Spacing.md },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 5,
  },
  featureIcon: { marginTop: 2 },
  featureText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray700,
    lineHeight: 19,
  },

  tierRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  tierRange: { flex: 1 },
  rangeText: {
    fontSize: FontSize.xs,
    color: Colors.gray600,
    lineHeight: 17,
  },
  rangeDivider: { color: Colors.gray300 },
  rangeNote: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontStyle: 'italic',
    marginTop: 2,
  },
  tierPrice: { alignItems: 'flex-end' },
  price: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.error,
  },
  priceWas: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    textDecorationLine: 'line-through',
    marginTop: 1,
  },

  emptyState: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.gray600,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 19,
  },

  tipsBox: { marginTop: Spacing.lg },
  tipsTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: Spacing.sm,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: 6,
  },
  tipBullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 7,
  },
  tipText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
});
