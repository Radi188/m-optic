import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Spacing } from '../../../theme';

const SkeletonRewardScreen: React.FC = () => {
  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      {/* Points Card */}
      <View style={[styles.skeletonBox, styles.pointsCard]} />

      {/* Rewards Card Placeholders */}
      <View style={{ marginTop: Spacing.lg }}>
        {[...Array(3)].map((_, i) => (
          <View key={i} style={[styles.skeletonBox, styles.rewardCard]} />
        ))}
      </View>

      {/* Redeem History Placeholders */}
      <View style={{ marginTop: Spacing.lg }}>
        {[...Array(3)].map((_, i) => (
          <View key={i} style={[styles.skeletonBox, styles.historyCard]} />
        ))}
      </View>
    </ScrollView>
  );
};

export default SkeletonRewardScreen;

const styles = StyleSheet.create({
  skeletonBox: {
    backgroundColor: '#E0DFDD',
  },
  pointsCard: {
    height: 150,
    borderRadius: 28,
    marginBottom: 24,
  },
  rewardCard: {
    height: 80,
    borderRadius: 24,
    marginBottom: 16,
  },
  historyCard: {
    height: 60,
    borderRadius: 20,
    marginBottom: 12,
  },
});
