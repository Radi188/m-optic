import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Spacing, BorderRadius, Shadow } from '../../../theme';
import { SkeletonBlock, SkeletonCircle } from './Skeleton';

/** Points screen placeholder: the balance card, then the transaction rows. */
const PointsSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <View style={styles.root}>
    <View style={styles.balanceCard}>
      <SkeletonBlock width={110} height={14} />
      <SkeletonBlock width={160} height={38} style={styles.balance} />
      <SkeletonBlock height={8} radius={4} style={styles.progress} />
      <SkeletonBlock width="55%" height={13} style={styles.gap} />
    </View>

    <SkeletonBlock width={140} height={18} style={styles.sectionTitle} />

    {Array.from({ length: rows }).map((_, i) => (
      <View key={i} style={styles.row}>
        <SkeletonCircle size={40} />
        <View style={styles.rowText}>
          <SkeletonBlock width="60%" height={15} />
          <SkeletonBlock width="35%" height={12} style={styles.gapSm} />
        </View>
        <SkeletonBlock width={54} height={18} />
      </View>
    ))}
  </View>
);

export default PointsSkeleton;

const styles = StyleSheet.create({
  root: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  balanceCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },
  balance: { marginTop: Spacing.sm },
  progress: { marginTop: Spacing.lg },
  gap: { marginTop: Spacing.sm },
  gapSm: { marginTop: 6 },
  sectionTitle: { marginBottom: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rowText: { flex: 1, marginHorizontal: Spacing.md },
});
