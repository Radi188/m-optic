import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import ProfilePointSection from '../components/ui/Profile/ProfilePointSection';
import { usePoints } from '../hook/usePoint';
import Header from '../components/ui/Header/HeaderComponent';
import ErrorComponent from '../components/ui/Error/ErrorComponent';

type PointsMemberScreenProps = {
  navigation?: any;
};

const PointsMemberScreen: React.FC<PointsMemberScreenProps> = ({
  navigation,
}) => {
  const { pointsData, transactions, isLoading, isRefreshing, error, refetch } =
    usePoints();

  const currentTierName = pointsData?.tier?.name ?? 'Silver';
  const nextTierName = pointsData?.next_tier?.name ?? 'Max Tier';
  const progress = pointsData?.progress_percentage ?? 0;

  const tiers = useMemo(() => pointsData?.all_tiers ?? [], [pointsData]);
  const activeTierIndex = useMemo(() => {
    return tiers.findIndex(tier => tier.id === pointsData?.tier?.id);
  }, [tiers, pointsData?.tier?.id]);

  const tierLineProgress = useMemo(() => {
    if (!tiers.length || activeTierIndex < 0) {
      return 0;
    }

    if (!pointsData?.next_tier) {
      return 100;
    }

    const maxIndex = tiers.length - 1;
    const currentStepProgress = progress / 100;
    const totalProgress =
      ((activeTierIndex + currentStepProgress) / maxIndex) * 100;

    return Math.min(Math.max(totalProgress, 0), 100);
  }, [tiers, activeTierIndex, progress, pointsData?.next_tier]);

  const benefits = [
    {
      icon: 'sparkles-outline',
      title: 'Free Cleaning',
      subtitle: 'Unlimited lens cleaning',
    },
    {
      icon: 'gift-outline',
      title: 'Birthday Gift',
      subtitle: 'Special gift on birthday',
    },
    {
      icon: 'pricetag-outline',
      title: `${pointsData?.tier?.discount_percentage ?? '0'}% Discount`,
      subtitle: 'Exclusive product discount',
    },
  ];

  const earnPoints = [
    {
      icon: 'eye-outline',
      title: 'Buy glasses',
      points: '+100 pts',
    },
    {
      icon: 'eye-outline',
      title: 'Eye check-up',
      points: '+50 pts',
    },
    {
      icon: 'people-outline',
      title: 'Refer a friend',
      points: '+200 pts',
    },
    {
      icon: 'star-outline',
      title: 'Review our store',
      points: '+30 pts',
    },
  ];

  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#9B6A3D" />
          <Text style={styles.centerText}>Loading points...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !pointsData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="My Points" onBack={() => navigation.goBack()} />
        <ErrorComponent onRetry={refetch} headerTitle="Rewards Error" />
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

          <Text style={styles.headerTitle}>My Points</Text>

          <TouchableOpacity activeOpacity={0.75} style={styles.headerButton}>
            <Ionicons name="time-outline" size={22} color="#241812" />
          </TouchableOpacity>
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
            points={pointsData.loyalty_total_points ?? 0}
            remainingPoints={pointsData.points_to_next_tier ?? 0}
            nextTier={nextTierName}
            progress={progress}
          />

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
              {tiers.map((tier, index) => {
                const isActive = tier.id === pointsData.tier?.id;
                const isCompleted = index < activeTierIndex;

                return (
                  <TierItem
                    key={tier.id}
                    title={tier.name}
                    points={`${tier.min_points.toLocaleString()} pts`}
                    icon={isActive ? 'diamond' : 'diamond-outline'}
                    active={isActive}
                    completed={isCompleted}
                  />
                );
              })}
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Rewards</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.rewardPreviewCard}
            onPress={() => navigation?.navigate?.('RewardScreen')}
          >
            <View style={styles.rewardPreviewLeft}>
              <View style={styles.rewardIconBox}>
                <Ionicons name="gift-outline" size={22} color="#FFFFFF" />
              </View>

              <View style={styles.rewardPreviewTextBox}>
                <Text style={styles.rewardPreviewTitle}>
                  Redeem Your Points
                </Text>
                <Text style={styles.rewardPreviewSubtitle}>
                  Use your points for discounts and special gifts
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={22} color="#A39186" />
          </TouchableOpacity>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Benefits</Text>
          </View>

          <View style={styles.benefitRow}>
            {benefits.map((item, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                style={styles.benefitCard}
              >
                <View style={styles.smallIconBox}>
                  <Ionicons name={item.icon as any} size={20} color="#8A552E" />
                </View>

                <Text style={styles.benefitTitle} numberOfLines={1}>
                  {item.title}
                </Text>

                <Text style={styles.benefitSubtitle} numberOfLines={2}>
                  {item.subtitle}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Earn More Points</Text>
          </View>

          <View style={styles.listCard}>
            {earnPoints.map((item, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.75}
                style={[
                  styles.listItem,
                  index !== earnPoints.length - 1 && styles.listDivider,
                ]}
              >
                <View style={styles.listLeft}>
                  <View style={styles.listIconBox}>
                    <Ionicons
                      name={item.icon as any}
                      size={18}
                      color="#9B6A3D"
                    />
                  </View>
                  <Text style={styles.listTitle}>{item.title}</Text>
                </View>

                <View style={styles.listRight}>
                  <Text style={styles.earnPointText}>{item.points}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#A39186" />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>

            {/* <TouchableOpacity activeOpacity={0.75} style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View all</Text>
              <Ionicons name="chevron-forward" size={18} color="#9B6A3D" />
            </TouchableOpacity> */}
          </View>

          {transactions?.data?.length > 0 ? (
            <View style={styles.listCard}>
              {pointsData.recent_transactions.map((item, index) => {
                const isMinus = item.points < 0 || item.type === 'redeem';

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.activityItem,
                      index !== pointsData.recent_transactions.length - 1 &&
                        styles.listDivider,
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
                        <Text style={styles.listTitle}>
                          {item.description || 'Point transaction'}
                        </Text>
                        <Text style={styles.activityDate}>
                          {formatDateTime(item.created_at)}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.activityPointText,
                        isMinus && styles.minusPointText,
                      ]}
                    >
                      {isMinus ? '' : '+'}
                      {item.points} pts
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyActivityCard}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="receipt-outline" size={24} color="#9B6A3D" />
              </View>

              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptyText}>
                Your points history will appear here.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

type TierItemProps = {
  title: string;
  points: string;
  icon: string;
  active?: boolean;
  completed?: boolean;
};

const TierItem: React.FC<TierItemProps> = ({
  title,
  points,
  icon,
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
          name={icon as any}
          size={22}
          color={active ? '#FFFFFF' : completed ? '#9B6A3D' : '#B8B0AA'}
        />
      </View>

      <Text style={[styles.tierTitle, active && styles.tierTitleActive]}>
        {title}
      </Text>
      <Text style={styles.tierPoint}>{points}</Text>
    </View>
  );
};

const formatDateTime = (dateString?: string | null) => {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('en-GB', {
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
    top: 39,
    left: 54,
    right: 54,
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
    justifyContent: 'space-between',
  },
  tierItem: {
    width: '31%',
    alignItems: 'center',
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
