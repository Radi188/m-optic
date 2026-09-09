import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../theme';
import { useReward } from '../hook/useReward';
import {
  redeemStatusOf,
  rewardImageUrl,
  RewardItem,
} from '../types/reward';
import type { RedeemHistoryItem, RedeemStatus } from '../types/reward';
import SkeletonRewardScreen from '../components/ui/Loading/RewardLoadingScreen';
import ErrorComponent from '../components/ui/Error/ErrorComponent';
import Header from '../components/ui/Header/HeaderComponent';
import AppText from '../components/AppText';
import AppImage from '../components/AppImage';

type RewardScreenProps = {
  navigation?: any;
};

const RewardScreen: React.FC<RewardScreenProps> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const {
    rewardsData,
    isLoading,
    isRefreshing,
    error,
    refetch,
    redeemingId,
    redeem,
  } = useReward();

  const locale = i18n.language === 'km' ? 'km-KH' : 'en-GB';

  const rewards = rewardsData?.rewards ?? [];
  const history = rewardsData?.redeem_history ?? [];

  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    }
  };

  /**
   * `can_redeem` is the server's own verdict and is authoritative; the balance
   * comparison is only a fallback for a payload that omits it. `available` is
   * the older spelling.
   */
  const canRedeemReward = (reward: RewardItem, balance: number): boolean => {
    if (typeof reward.can_redeem === 'boolean') return reward.can_redeem;
    if (typeof reward.available === 'boolean') return reward.available;
    return balance >= reward.points_required;
  };

  /**
   * Spending points is not undoable, so it takes a confirmation naming the
   * reward and its cost before the request goes out.
   */
  const handleRedeem = (userPoint: number, reward: RewardItem) => {
    if (!canRedeemReward(reward, userPoint) || redeemingId !== null) return;

    const name = reward.name ?? reward.title ?? t('Reward');

    Alert.alert(
      t('RedeemReward'),
      t('RedeemConfirm', {
        reward: name,
        points: reward.points_required.toLocaleString(locale),
      }),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Redeem'),
          onPress: async () => {
            const result = await redeem(reward.id);

            Alert.alert(
              result.ok ? t('RedeemSuccess') : t('RedeemFailed'),
              result.message ??
                (result.ok
                  ? t('RedeemSuccessMessage', { reward: name })
                  : t('SomethingWentWrongTryAgain')),
            );
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title={t('Rewards')} onBack={() => navigation.goBack()} />
        <SkeletonRewardScreen />
      </SafeAreaView>
    );
  }

  if (error || !rewardsData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title={t('Rewards')} onBack={() => navigation.goBack()} />
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
            style={[styles.headerButton, styles.headerLeftButton]}
            onPress={handleBack}
          >
            <Ionicons name="chevron-back" size={24} color="#241812" />
          </TouchableOpacity>

          <AppText style={styles.headerTitle}>{t('Rewards')}</AppText>

          <View style={[styles.headerButton, styles.headerButtonPlaceholder]} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refetch}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          <View style={styles.balanceCard}>
            <View style={styles.balanceContent}>
              <AppText style={styles.balanceLabel}>
                {t('AvailablePoints')}
              </AppText>
              <AppText style={styles.balancePoint}>
                {(rewardsData?.available_points ?? 0).toLocaleString(locale)}
              </AppText>
              <AppText style={styles.balanceSubtitle}>
                {t('RedeemPointsSubtitle')}
              </AppText>
            </View>

            <View style={styles.balanceIconBox}>
              <Ionicons name="diamond" size={26} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIconBox}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#9B6A3D"
              />
            </View>

            <AppText style={styles.infoText}>
              {t('RewardsStoreCheckoutNote')}
            </AppText>
          </View>

          {rewards.length > 0 && (
            <View style={styles.sectionHeader}>
              <AppText style={styles.sectionTitle}>
                {t('AvailableRewards')}
              </AppText>
              <AppText style={styles.sectionHint}>{t('TapToRedeem')}</AppText>
            </View>
          )}

          {rewards.map(reward => {
            const canRedeem = canRedeemReward(
              reward,
              rewardsData.available_points,
            );

            // The API sends the shortfall itself; computing it locally is the
            // fallback, floored so it never reads as a negative.
            const pointsLeft =
              reward.points_needed ??
              Math.max(
                reward.points_required - rewardsData.available_points,
                0,
              );

            const isRedeeming = redeemingId === reward.id;
            const isBusy = redeemingId !== null;

            const image = rewardImageUrl(reward.image ?? reward.image_url);
            const name = reward.name ?? reward.title ?? '';
            const badge = reward.badge ?? reward.tag;

            return (
              <TouchableOpacity
                key={reward.id}
                activeOpacity={0.82}
                disabled={!canRedeem || isBusy}
                style={[
                  styles.rewardCard,
                  !canRedeem && styles.rewardCardDisabled,
                  isBusy && !isRedeeming && styles.rewardCardBusy,
                ]}
                onPress={() =>
                  handleRedeem(rewardsData.available_points, reward)
                }
              >
                <View
                  style={[
                    styles.rewardImageBox,
                    !canRedeem && styles.rewardImageBoxDisabled,
                  ]}
                >
                  {image ? (
                    <AppImage
                      source={{ uri: image }}
                      resizeMode="contain"
                      style={styles.rewardImage}
                    />
                  ) : (
                    <Ionicons
                      name="gift-outline"
                      size={22}
                      color={canRedeem ? '#9B6A3D' : '#AFA6A0'}
                    />
                  )}
                </View>

                <View style={styles.rewardContent}>
                  <View style={styles.rewardTitleRow}>
                    <AppText style={styles.rewardTitle} numberOfLines={1}>
                      {name}
                    </AppText>

                    {/* The badge carries its own colour from the API; the
                        beige default is used when none is supplied. */}
                    {badge ? (
                      <View
                        style={[
                          styles.rewardTag,
                          !!reward.badge_color && {
                            backgroundColor: reward.badge_color,
                            borderColor: reward.badge_color,
                          },
                        ]}
                      >
                        <AppText
                          style={[
                            styles.rewardTagText,
                            !!reward.badge_color && styles.rewardTagTextOnFill,
                          ]}
                        >
                          {badge}
                        </AppText>
                      </View>
                    ) : null}
                  </View>

                  {/* Cost and shortfall share one line — the card no longer
                      needs a second row of its own for them. */}
                  <View style={styles.rewardMetaRow}>
                    <Ionicons
                      name="diamond"
                      size={11}
                      color={canRedeem ? '#9B6A3D' : '#A79C95'}
                    />
                    <AppText
                      style={[
                        styles.rewardMeta,
                        !canRedeem && styles.rewardMetaDisabled,
                      ]}
                      numberOfLines={1}
                    >
                      {reward.points_required.toLocaleString(locale)} {t('Pts')}
                      {!canRedeem && pointsLeft > 0
                        ? `  ·  ${t('NeedPoints', {
                            points: pointsLeft.toLocaleString(locale),
                          })}`
                        : ''}
                    </AppText>
                  </View>
                </View>

                {isRedeeming ? (
                  <View style={styles.redeemButton}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                ) : canRedeem ? (
                  <View style={styles.redeemButton}>
                    <AppText style={styles.redeemButtonText}>
                      {t('Redeem')}
                    </AppText>
                  </View>
                ) : (
                  <View style={styles.lockedButton}>
                    <Ionicons
                      name="lock-closed"
                      size={13}
                      color="#A79C95"
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          <View style={styles.sectionHeader}>
            <AppText style={styles.sectionTitle}>{t('RedeemHistory')}</AppText>
          </View>

          {/* This block used to render the empty state unconditionally, so a
              redemption never appeared once the backend recorded one. */}
          {history.length > 0 ? (
            <View style={styles.historyListCard}>
              {history.map((item, index) => (
                <HistoryRow
                  key={item.id ?? index}
                  item={item}
                  rewards={rewards}
                  locale={locale}
                  isLast={index === history.length - 1}
                />
              ))}
            </View>
          ) : (
            <View style={styles.historyCard}>
              <View style={styles.emptyHistoryIcon}>
                <Ionicons name="receipt-outline" size={24} color="#9B6A3D" />
              </View>

              <View style={styles.historyTextBox}>
                <AppText style={styles.historyTitle}>
                  {t('NoRewardsRedeemedYet')}
                </AppText>
                <AppText style={styles.historySubtitle}>
                  {t('RedeemedRewardsAppearHere')}
                </AppText>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default RewardScreen;


/**
 * One past redemption.
 *
 * The history row carries the item the customer redeemed — its picture and
 * name — because "-10 pts" on its own does not tell them what to collect. The
 * endpoint may not repeat the artwork on a history row, so it is looked up in
 * the rewards catalogue by `reward_id` when absent.
 */
const HistoryRow: React.FC<{
  item: RedeemHistoryItem;
  rewards: RewardItem[];
  locale: string;
  isLast: boolean;
}> = ({ item, rewards, locale, isLast }) => {
  const { t } = useTranslation();

  const rewardId = item.loyalty_reward_id ?? item.reward_id ?? item.reward?.id;
  const source = rewards.find(reward => reward.id === rewardId);

  // `reward.image` is a bare storage path here, unlike the catalogue's
  // absolute URL — both go through the same resolver.
  const image = rewardImageUrl(
    item.reward?.image ?? item.image ?? source?.image ?? source?.image_url,
  );
  const name =
    item.reward?.name ??
    item.name ??
    item.title ??
    source?.name ??
    source?.title ??
    t('Reward');

  const status = redeemStatusOf(item);
  const code = item.code ?? item.redeem_code;
  const date = formatDate(item.redeemed_at ?? item.created_at, locale);

  return (
    <View style={[styles.historyRow, !isLast && styles.historyDivider]}>
      <View style={styles.historyIconBox}>
        {image ? (
          <AppImage
            source={{ uri: image }}
            resizeMode="contain"
            style={styles.historyImage}
          />
        ) : (
          <Ionicons name="gift-outline" size={18} color="#9B6A3D" />
        )}
      </View>

      <View style={styles.historyTextBox}>
        <AppText style={styles.historyTitle} numberOfLines={1}>
          {name}
        </AppText>

        <AppText style={styles.historySubtitle} numberOfLines={1}>
          {[date, code ? `#${code}` : null].filter(Boolean).join('  ·  ')}
        </AppText>

        <StatusPill status={status} />
      </View>

      <AppText style={styles.historyPoints}>
        -{(item.points_used ?? item.points ?? 0).toLocaleString(locale)}{' '}
        {t('Pts')}
      </AppText>
    </View>
  );
};

const StatusPill: React.FC<{ status: RedeemStatus }> = ({ status }) => {
  const { t } = useTranslation();

  // Pending is the state that needs an action from the customer, so it is the
  // one that carries colour; collected is settled and stays quiet.
  const theme =
    status === 'collected'
      ? { bg: '#E7F6EE', fg: '#1F8A54', icon: 'checkmark-circle' }
      : status === 'cancelled'
      ? { bg: '#F3F0EE', fg: '#8B7C72', icon: 'close-circle' }
      : { bg: '#FFF3D9', fg: '#A16A26', icon: 'time' };

  const label =
    status === 'collected'
      ? t('Collected')
      : status === 'cancelled'
      ? t('Cancelled')
      : t('AwaitingCollection');

  return (
    <View style={[styles.statusPill, { backgroundColor: theme.bg }]}>
      <Ionicons name={theme.icon as any} size={11} color={theme.fg} />
      <AppText style={[styles.statusPillText, { color: theme.fg }]}>
        {label}
      </AppText>
    </View>
  );
};

const formatDate = (iso?: string | null, locale = 'en-GB'): string | null => {
  if (!iso) return null;
  const date = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

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
    height: 64,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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

  headerLeftButton: {
    position: 'absolute',
    left: 20,
  },

  headerRightButton: {
    position: 'absolute',
    right: 20,
  },

  headerTitle: {
    position: 'absolute',
    left: 80,
    right: 80,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900',
    color: '#1F1712',
    letterSpacing: -0.3,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 44,
  },

  balanceCard: {
    minHeight: 156,
    borderRadius: 30,
    padding: 22,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#2A160A',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 6,
  },

  balanceContent: {
    flex: 1,
    marginRight: 16,
  },

  balanceLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E8D3C0',
  },

  balancePoint: {
    marginTop: 8,
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },

  balanceSubtitle: {
    marginTop: 8,
    maxWidth: 230,
    fontSize: 13,
    lineHeight: 19,
    color: '#F3E3D4',
  },

  balanceIconBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },

  infoCard: {
    marginTop: 16,
    minHeight: 58,
    borderRadius: 20,
    backgroundColor: '#FFF8F0',
    borderWidth: 1,
    borderColor: '#F2DEC7',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  infoIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F7E7D6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#7A604F',
  },

  sectionHeader: {
    marginTop: 26,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#211813',
    letterSpacing: -0.4,
  },

  sectionHint: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9B6A3D',
  },

  // One compact row: thumbnail, name + cost, action. The card used to stack a
  // 62pt image block over a separate pill/button row, which made every reward
  // ~150pt tall for two short lines of text.
  rewardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0E8E2',
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Locked rewards are marked by the lock and the muted cost line, not by
  // fading the whole card — washing out the artwork read as a blurry image.
  rewardCardDisabled: {
    backgroundColor: '#FFFFFF',
  },

  // Other cards dim while one redemption is in flight, so it is clear the
  // list is momentarily locked rather than unresponsive.
  rewardCardBusy: {
    opacity: 0.5,
  },

  rewardImageBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FBF1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },

  rewardImageBoxDisabled: {
    backgroundColor: '#F5F1EE',
  },

  rewardImage: {
    width: 38,
    height: 38,
  },

  rewardContent: {
    flex: 1,
    marginRight: 10,
  },

  rewardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rewardTitle: {
    flexShrink: 1,
    fontSize: 14.5,
    fontWeight: '800',
    color: '#241812',
    letterSpacing: -0.2,
    marginRight: 8,
  },

  rewardMetaRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  rewardMeta: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#9B6A3D',
  },

  rewardMetaDisabled: {
    fontWeight: '600',
    color: '#A79C95',
  },

  rewardTag: {
    backgroundColor: '#FFF3D9',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#F0D49D',
  },

  rewardTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#A16A26',
  },

  // When the API supplies `badge_color` the pill is filled with it, so the
  // label has to flip to white to stay legible.
  rewardTagTextOnFill: {
    color: '#FFFFFF',
  },

  redeemButton: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  redeemButtonText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  lockedButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F1EE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  viewAllText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#9B6A3D',
  },

  historyCard: {
    minHeight: 82,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE5DD',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  emptyHistoryIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FBF1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  historyTextBox: {
    flex: 1,
  },

  historyTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#241812',
  },

  historySubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#8B7C72',
  },

  historyListCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE5DD',
    overflow: 'hidden',
  },

  historyRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  historyDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1EAE5',
  },

  historyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FBF1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },

  historyImage: {
    width: 36,
    height: 36,
  },

  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },

  statusPillText: {
    fontSize: 10.5,
    fontWeight: '900',
  },

  historyPoints: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '900',
    color: '#8F3E2F',
  },

  headerButtonPlaceholder: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
});
