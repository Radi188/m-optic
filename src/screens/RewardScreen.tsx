import React from 'react';
import {
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
import { RewardItem } from '../types/reward';
import SkeletonRewardScreen from '../components/ui/Loading/RewardLoadingScreen';
import ErrorComponent from '../components/ui/Error/ErrorComponent';
import Header from '../components/ui/Header/HeaderComponent';
import AppText from '../components/AppText';

type RewardScreenProps = {
  navigation?: any;
};

const RewardScreen: React.FC<RewardScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { rewardsData, isLoading, isRefreshing, error, refetch } = useReward();

  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    }
  };

  const handleRedeem = (userPoint: number, reward: RewardItem) => {
    const canRedeem = userPoint >= reward.points_required && reward.available;

    if (!canRedeem) return;

    console.log('Redeem reward:', reward);
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

          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.headerButton, styles.headerRightButton]}
          >
            <Ionicons name="time-outline" size={22} color="#241812" />
          </TouchableOpacity>
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
                {rewardsData?.available_points.toLocaleString()}
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

          {rewardsData?.rewards?.length > 0 && (
            <View style={styles.sectionHeader}>
              <AppText style={styles.sectionTitle}>
                {t('AvailableRewards')}
              </AppText>
              <AppText style={styles.sectionHint}>{t('TapToRedeem')}</AppText>
            </View>
          )}

          {rewardsData?.rewards.map(reward => {
            const canRedeem =
              rewardsData.available_points >= reward.points_required &&
              reward.available;

            const pointsLeft =
              reward.points_required - rewardsData.available_points;

            return (
              <TouchableOpacity
                key={reward.id}
                activeOpacity={0.82}
                style={[
                  styles.rewardCard,
                  !canRedeem && styles.rewardCardDisabled,
                ]}
                onPress={() =>
                  handleRedeem(rewardsData.available_points, reward)
                }
              >
                <View style={styles.rewardTopRow}>
                  <View
                    style={[
                      styles.rewardImageBox,
                      !canRedeem && styles.rewardImageBoxDisabled,
                    ]}
                  >
                    {reward.image_url ? (
                      <Image
                        source={{ uri: reward.image_url }}
                        style={[
                          styles.rewardImage,
                          !canRedeem && styles.rewardImageDisabled,
                        ]}
                      />
                    ) : (
                      <Ionicons
                        name="gift-outline"
                        size={24}
                        color={canRedeem ? '#9B6A3D' : '#AFA6A0'}
                      />
                    )}
                  </View>

                  <View style={styles.rewardContent}>
                    <View style={styles.rewardTitleRow}>
                      <AppText
                        style={[
                          styles.rewardTitle,
                          !canRedeem && styles.rewardTitleDisabled,
                        ]}
                        numberOfLines={1}
                      >
                        {reward.title}
                      </AppText>

                      {reward.tag && canRedeem ? (
                        <View style={styles.rewardTag}>
                          <AppText style={styles.rewardTagText}>
                            {reward.tag}
                          </AppText>
                        </View>
                      ) : null}
                    </View>

                    <AppText
                      style={[
                        styles.rewardSubtitle,
                        !canRedeem && styles.rewardSubtitleDisabled,
                      ]}
                      numberOfLines={2}
                    >
                      {reward.description}
                    </AppText>
                  </View>
                </View>

                <View style={styles.rewardBottomRow}>
                  <View style={styles.pointPill}>
                    <Ionicons
                      name="diamond-outline"
                      size={14}
                      color={canRedeem ? '#9B6A3D' : '#9B928B'}
                    />
                    <AppText
                      style={[
                        styles.pointPillText,
                        !canRedeem && styles.pointPillTextDisabled,
                      ]}
                    >
                      {reward.points_required.toLocaleString()} {t('Pts')}
                    </AppText>
                  </View>

                  {canRedeem ? (
                    <View style={styles.redeemButton}>
                      <AppText style={styles.redeemButtonText}>
                        {t('Redeem')}
                      </AppText>
                    </View>
                  ) : (
                    <View style={styles.lockedButton}>
                      <Ionicons
                        name="lock-closed-outline"
                        size={13}
                        color="#8B7C72"
                      />
                      <AppText style={styles.lockedButtonText}>
                        {t('NeedPoints', {
                          points: pointsLeft.toLocaleString(),
                        })}
                      </AppText>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={styles.sectionHeader}>
            <AppText style={styles.sectionTitle}>{t('RedeemHistory')}</AppText>

            <TouchableOpacity activeOpacity={0.75} style={styles.viewAllButton}>
              <AppText style={styles.viewAllText}>{t('ViewAll')}</AppText>
              <Ionicons name="chevron-forward" size={18} color="#9B6A3D" />
            </TouchableOpacity>
          </View>

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
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default RewardScreen;

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

  rewardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFE5DD',
    shadowColor: '#2A160A',
    shadowOpacity: 0.045,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 2,
  },

  rewardCardDisabled: {
    backgroundColor: '#FFFCFA',
    opacity: 0.9,
  },

  rewardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rewardImageBox: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: '#FBF1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },

  rewardImageBoxDisabled: {
    backgroundColor: '#F3F0EE',
  },

  rewardImage: {
    width: 62,
    height: 62,
    resizeMode: 'cover',
  },

  rewardImageDisabled: {
    opacity: 0.45,
  },

  rewardContent: {
    flex: 1,
  },

  rewardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  rewardTitle: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '900',
    color: '#241812',
    letterSpacing: -0.2,
    marginRight: 8,
  },

  rewardTitleDisabled: {
    color: '#7F7771',
  },

  rewardTag: {
    backgroundColor: '#FFF3D9',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#F0D49D',
  },

  rewardTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#A16A26',
  },

  rewardSubtitle: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: '#8B7C72',
  },

  rewardSubtitleDisabled: {
    color: '#A39B95',
  },

  rewardBottomRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  pointPill: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 11,
    backgroundColor: '#FAF1E9',
    flexDirection: 'row',
    alignItems: 'center',
  },

  pointPillText: {
    marginLeft: 5,
    fontSize: 13,
    fontWeight: '900',
    color: '#9B6A3D',
  },

  pointPillTextDisabled: {
    color: '#8B7C72',
  },

  redeemButton: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  redeemButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  lockedButton: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 13,
    backgroundColor: '#F5EFEB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  lockedButtonText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '800',
    color: '#8B7C72',
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
});
