import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTranslation } from 'react-i18next';
import ProfilePointSection from '../components/ui/Profile/ProfilePointSection';
import { usePoints } from '../hook/usePoint';
import Header from '../components/ui/Header/HeaderComponent';
import PointsSkeleton from '../components/ui/Loading/PointsLoadingScreen';
import ErrorComponent from '../components/ui/Error/ErrorComponent';
import AppText from '../components/AppText';

type PointsMemberScreenProps = {
  navigation?: any;
};

/**
 * Maps the backend's benefit `icon` slug onto an Ionicon.
 *
 * The API sends short words ("gift", "frame", "tag", "case") rather than icon
 * names, so an unknown slug has to degrade to a generic badge instead of
 * rendering as a missing glyph.
 */
const BENEFIT_ICONS: Record<string, string> = {
  gift: 'gift-outline',
  frame: 'glasses-outline',
  glasses: 'glasses-outline',
  tag: 'pricetag-outline',
  discount: 'pricetag-outline',
  case: 'briefcase-outline',
  clean: 'sparkles-outline',
  cleaning: 'sparkles-outline',
  star: 'star-outline',
  eye: 'eye-outline',
};

const benefitIcon = (icon?: string | null): string =>
  BENEFIT_ICONS[(icon ?? '').toLowerCase().trim()] ?? 'ribbon-outline';

/** "5.00" → "5", "12.50" → "12.5". Percentages arrive as money-style strings. */
const formatPercent = (value?: string | number | null): string | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${Number(n.toFixed(2))}%`;
};

const PointsMemberScreen: React.FC<PointsMemberScreenProps> = ({
  navigation,
}) => {
  const { t, i18n } = useTranslation();
  const { pointsData, transactions, isLoading, isRefreshing, error, refetch } =
    usePoints();

  // Passed through as-is: the card themes itself from the real tier, and a
  // null tier must read as "no tier yet" rather than defaulting to Silver.
  const currentTierName = pointsData?.tier?.name ?? null;
  const nextTierName = pointsData?.next_tier?.name ?? null;
  const progress = pointsData?.progress_percentage ?? 0;

  const tiers = useMemo(() => pointsData?.all_tiers ?? [], [pointsData]);

  const activeTierIndex = useMemo(
    () => tiers.findIndex(tier => tier.id === pointsData?.tier?.id),
    [tiers, pointsData?.tier?.id],
  );

  const tierLineProgress = useMemo(() => {
    if (!tiers.length || activeTierIndex < 0) return 0;
    if (!pointsData?.next_tier) return 100;

    const maxIndex = tiers.length - 1;
    if (maxIndex <= 0) return 100;

    const currentStepProgress = progress / 100;
    const totalProgress =
      ((activeTierIndex + currentStepProgress) / maxIndex) * 100;

    return Math.min(Math.max(totalProgress, 0), 100);
  }, [tiers, activeTierIndex, progress, pointsData?.next_tier]);

  // The tier's own benefits, ordered the way the shop arranged them.
  const benefits = useMemo(() => {
    const rows = pointsData?.tier?.benefits ?? [];
    return [...rows].sort(
      (a: any, b: any) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0),
    );
  }, [pointsData?.tier?.benefits]);

  // What the next tier adds. `next_tier` itself arrives without benefits, so
  // the full row is looked up in `all_tiers`.
  const nextTierBenefits = useMemo(() => {
    const nextId = pointsData?.next_tier?.id;
    if (!nextId) return [];
    const full = tiers.find(tier => tier.id === nextId);
    return [...(full?.benefits ?? [])].sort(
      (a: any, b: any) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0),
    );
  }, [tiers, pointsData?.next_tier?.id]);

  // `/profile/transactions` is the paginated history; `recent_transactions` on
  // the points payload is the same data trimmed, and covers the case where the
  // paginated call comes back empty.
  const activity = useMemo(() => {
    const paged = transactions?.data ?? [];
    return paged.length ? paged : pointsData?.recent_transactions ?? [];
  }, [transactions?.data, pointsData?.recent_transactions]);

  const discount = formatPercent(pointsData?.tier?.discount_percentage);

  const locale = i18n.language === 'km' ? 'km-KH' : 'en-GB';

  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title={t('MyPoints')} onBack={() => navigation.goBack()} />
        <PointsSkeleton />
      </SafeAreaView>
    );
  }

  if (error || !pointsData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title={t('MyPoints')} onBack={() => navigation.goBack()} />
        <ErrorComponent onRetry={refetch} headerTitle={t('RewardsError')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.headerButton}
            onPress={handleBack}
          >
            <Ionicons name="chevron-back" size={24} color="#241812" />
          </TouchableOpacity>

          <AppText style={styles.headerTitle}>{t('MyPoints')}</AppText>

          <View style={styles.headerButtonPlaceholder} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refetch} />
          }
        >
          <ProfilePointSection
            tierName={currentTierName}
            points={pointsData.loyalty_total_points}
            remainingPoints={pointsData.points_to_next_tier}
            nextTier={nextTierName}
            progress={progress}
          />

          {/* The tier is earned on lifetime points, but only the balance can be
              spent — showing one number for both was the ambiguity here. */}
          <View style={styles.statRow}>
            <StatTile
              icon="wallet-outline"
              label={t('AvailablePoints')}
              value={(pointsData.loyalty_points ?? 0).toLocaleString(locale)}
            />
            <StatTile
              icon="trending-up-outline"
              label={t('TotalEarned')}
              value={(pointsData.loyalty_total_points ?? 0).toLocaleString(
                locale,
              )}
            />
            {!!discount && (
              <StatTile
                icon="pricetag-outline"
                label={t('MemberDiscount')}
                value={discount}
              />
            )}
          </View>

          {/* ── Tier rail ── */}
          {tiers.length > 0 && (
            <View style={styles.tierCard}>
              <View style={styles.tierLineContainer}>
                <View style={styles.tierLine} />
                <View
                  style={[
                    styles.tierActiveLine,
                    { width: `${tierLineProgress}%` },
                  ]}
                />
              </View>

              <View style={styles.tierRow}>
                {tiers.map((tier, index) => (
                  <TierItem
                    key={tier.id}
                    title={tier.name}
                    points={`${tier.min_points.toLocaleString(locale)} ${t(
                      'Pts',
                    )}`}
                    active={tier.id === pointsData.tier?.id}
                    completed={activeTierIndex >= 0 && index < activeTierIndex}
                  />
                ))}
              </View>
            </View>
          )}

          {/* ── Benefits of the tier the member is on ── */}
          <View style={styles.sectionHeader}>
            <AppText style={styles.sectionTitle}>{t('YourBenefits')}</AppText>
            {!!currentTierName && (
              <View style={styles.sectionChip}>
                <AppText style={styles.sectionChipText}>
                  {currentTierName}
                </AppText>
              </View>
            )}
          </View>

          {benefits.length > 0 ? (
            <View style={styles.listCard}>
              {benefits.map((benefit: any, index: number) => (
                <View
                  key={benefit.id ?? index}
                  style={[
                    styles.listItem,
                    index !== benefits.length - 1 && styles.listDivider,
                  ]}
                >
                  <View style={styles.listLeft}>
                    <View style={styles.listIconBox}>
                      <Ionicons
                        name={benefitIcon(benefit.icon) as any}
                        size={18}
                        color="#9B6A3D"
                      />
                    </View>

                    <View style={styles.activityTextBox}>
                      <AppText style={styles.listTitle}>
                        {benefit.title ?? benefit.name ?? '—'}
                      </AppText>
                      {!!benefit.description && (
                        <AppText style={styles.activityDate}>
                          {benefit.description}
                        </AppText>
                      )}
                    </View>
                  </View>

                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#2DBD7E"
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyActivityCard}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="ribbon-outline" size={24} color="#9B6A3D" />
              </View>
              <AppText style={styles.emptyTitle}>{t('NoBenefitsYet')}</AppText>
            </View>
          )}

          {/* ── What the next tier unlocks ── */}
          {!!nextTierName && (
            <>
              <View style={styles.sectionHeader}>
                <AppText style={styles.sectionTitle}>
                  {t('NextTierBenefits', { tier: nextTierName })}
                </AppText>
              </View>

              <View style={styles.nextTierCard}>
                <View style={styles.nextTierHeader}>
                  <View style={styles.nextTierIconBox}>
                    <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
                  </View>

                  <View style={styles.rewardPreviewTextBox}>
                    <AppText style={styles.rewardPreviewTitle}>
                      {nextTierName}
                    </AppText>
                    <AppText style={styles.rewardPreviewSubtitle}>
                      {t('PointsToUnlock', {
                        points: (
                          pointsData.points_to_next_tier ?? 0
                        ).toLocaleString(locale),
                      })}
                    </AppText>
                  </View>

                  {!!formatPercent(
                    pointsData.next_tier?.discount_percentage,
                  ) && (
                    <View style={styles.nextTierBadge}>
                      <AppText style={styles.nextTierBadgeText}>
                        {formatPercent(
                          pointsData.next_tier?.discount_percentage,
                        )}
                      </AppText>
                    </View>
                  )}
                </View>

                {nextTierBenefits.map((benefit: any, index: number) => (
                  <View key={benefit.id ?? index} style={styles.lockedRow}>
                    <Ionicons
                      name={benefitIcon(benefit.icon) as any}
                      size={16}
                      color="#A08976"
                    />
                    <AppText style={styles.lockedText} numberOfLines={1}>
                      {benefit.title ?? benefit.name ?? '—'}
                    </AppText>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ── Rewards shortcut ── */}
          <View style={styles.sectionHeader}>
            <AppText style={styles.sectionTitle}>{t('Rewards')}</AppText>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.rewardPreviewCard}
            onPress={() => navigation?.navigate?.('Reward')}
          >
            <View style={styles.rewardPreviewLeft}>
              <View style={styles.rewardIconBox}>
                <Ionicons name="gift-outline" size={22} color="#FFFFFF" />
              </View>

              <View style={styles.rewardPreviewTextBox}>
                <AppText style={styles.rewardPreviewTitle}>
                  {t('RedeemYourPoints')}
                </AppText>
                <AppText style={styles.rewardPreviewSubtitle}>
                  {t('UsePointsForDiscounts')}
                </AppText>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={22} color="#A39186" />
          </TouchableOpacity>

          {/* ── Activity ── */}
          <View style={styles.sectionHeader}>
            <AppText style={styles.sectionTitle}>{t('RecentActivity')}</AppText>
          </View>

          {activity.length > 0 ? (
            <View style={styles.listCard}>
              {activity.map((item: any, index: number) => {
                const isMinus =
                  item.points < 0 || /redeem|spend|deduct/i.test(item.type ?? '');

                return (
                  <View
                    key={item.id ?? index}
                    style={[
                      styles.activityItem,
                      index !== activity.length - 1 && styles.listDivider,
                    ]}
                  >
                    <View style={styles.listLeft}>
                      <View style={styles.listIconBox}>
                        <Ionicons
                          name={
                            isMinus ? 'ticket-outline' : 'add-circle-outline'
                          }
                          size={18}
                          color="#9B6A3D"
                        />
                      </View>

                      <View style={styles.activityTextBox}>
                        <AppText style={styles.listTitle} numberOfLines={2}>
                          {item.description || t('PointTransaction')}
                        </AppText>
                        <AppText style={styles.activityDate}>
                          {formatDateTime(item.created_at, locale)}
                        </AppText>
                      </View>
                    </View>

                    <AppText
                      style={[
                        styles.activityPointText,
                        isMinus && styles.minusPointText,
                      ]}
                    >
                      {/* The sign already lives in the number when it is
                          negative; only earnings need one added. */}
                      {isMinus ? '' : '+'}
                      {item.points} {t('Pts')}
                    </AppText>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyActivityCard}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="receipt-outline" size={24} color="#9B6A3D" />
              </View>

              <AppText style={styles.emptyTitle}>{t('NoActivityYet')}</AppText>
              <AppText style={styles.emptyText}>
                {t('PointsHistoryAppearHere')}
              </AppText>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const StatTile: React.FC<{ icon: string; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <View style={styles.statTile}>
    <View style={styles.statIconBox}>
      <Ionicons name={icon as any} size={16} color="#9B6A3D" />
    </View>
    <AppText style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </AppText>
    <AppText style={styles.statLabel} numberOfLines={2}>
      {label}
    </AppText>
  </View>
);

type TierItemProps = {
  title: string;
  points: string;
  active?: boolean;
  completed?: boolean;
};

const TierItem: React.FC<TierItemProps> = ({
  title,
  points,
  active,
  completed,
}) => {
  return (
    <View style={styles.tierItem}>
      <View
        style={[
          styles.tierIconBox,
          active && styles.tierIconBoxActive,
          completed && styles.tierIconBoxCompleted,
        ]}
      >
        <Ionicons
          name={completed ? 'checkmark' : active ? 'diamond' : 'lock-closed'}
          size={20}
          color={active ? '#FFFFFF' : completed ? '#9B6A3D' : '#B8B0AA'}
        />
      </View>

      <AppText
        style={[styles.tierTitle, active && styles.tierTitleActive]}
        numberOfLines={1}
      >
        {title}
      </AppText>
      <AppText style={styles.tierPoint}>{points}</AppText>
    </View>
  );
};

const formatDateTime = (dateString?: string | null, locale = 'en-GB') => {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default PointsMemberScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFDFB',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFDFB',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centerText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#8B7C72',
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
    fontSize: 18,
    fontWeight: '900',
    color: '#241812',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#8B7C72',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 18,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 22,
    backgroundColor: '#9B6A3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  statTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFE5DD',
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FBF1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    alignSelf: 'stretch',
    fontSize: 20,
    fontWeight: '900',
    color: '#241812',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11.5,
    lineHeight: 15,
    color: '#8B7C72',
    textAlign: 'center',
  },
  sectionChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F7ECE2',
  },
  sectionChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8A552E',
  },
  nextTierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFE5DD',
    borderStyle: 'dashed',
  },
  nextTierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextTierIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A08976',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextTierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FBF1E8',
  },
  nextTierBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#8A552E',
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5EDE7',
  },
  lockedText: {
    flex: 1,
    fontSize: 14,
    color: '#7A6A60',
  },
  header: {
    height: 64,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFE7E1',
    shadowColor: '#2A160A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1F1712',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  tierCard: {
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: '#EFE5DD',
    shadowColor: '#2A160A',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 2,
  },
  tierLineContainer: {
    position: 'absolute',
    top: 44,
    left: 44,
    right: 44,
    height: 3,
    justifyContent: 'center',
  },
  tierLine: {
    height: 3,
    borderRadius: 3,
    backgroundColor: '#E8E2DD',
  },
  tierActiveLine: {
    position: 'absolute',
    left: 0,
    height: 3,
    borderRadius: 3,
    backgroundColor: '#D9A85F',
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
  },
  tierItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  tierIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F4F1EE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  tierIconBoxCompleted: {
    backgroundColor: '#F8EEE4',
  },
  tierIconBoxActive: {
    backgroundColor: '#B5793F',
    shadowColor: '#B5793F',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 3,
  },
  tierTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#8B7A6F',
  },
  tierTitleActive: {
    color: '#8A552E',
  },
  tierPoint: {
    marginTop: 3,
    fontSize: 12,
    color: '#9E9188',
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#211813',
    letterSpacing: -0.3,
  },
  rewardPreviewCard: {
    minHeight: 84,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#EFE5DD',
    shadowColor: '#2A160A',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 2,
  },
  rewardPreviewLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  rewardIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#B5793F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rewardPreviewTextBox: {
    flex: 1,
  },
  rewardPreviewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#241812',
    letterSpacing: -0.2,
  },
  rewardPreviewSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#8B7C72',
  },
  benefitRow: {
    flexDirection: 'row',
    gap: 10,
  },
  benefitCard: {
    flex: 1,
    minHeight: 128,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1E7DE',
    shadowColor: '#2A160A',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 2,
  },
  smallIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FBF1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  benefitTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#241812',
    letterSpacing: -0.2,
    marginBottom: 5,
    textAlign: 'center',
  },
  benefitSubtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    color: '#8B7C72',
    textAlign: 'center',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFE5DD',
    shadowColor: '#2A160A',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 2,
  },
  listItem: {
    minHeight: 64,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityItem: {
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1EAE5',
  },
  listLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F7ECE2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#241812',
  },
  listRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  earnPointText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#9B6A3D',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9B6A3D',
  },
  activityTextBox: {
    flex: 1,
  },
  activityDate: {
    marginTop: 4,
    fontSize: 12,
    color: '#9A8C83',
  },
  activityPointText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#9B6A3D',
    marginLeft: 10,
  },
  minusPointText: {
    color: '#8F3E2F',
  },
  emptyActivityCard: {
    minHeight: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EFE5DD',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  emptyIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FBF1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#241812',
  },
  emptyText: {
    marginTop: 4,
    fontSize: 13,
    color: '#8B7C72',
    textAlign: 'center',
  },
});
