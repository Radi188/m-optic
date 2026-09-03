import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Spacing, BorderRadius, Shadow } from '../../../theme';
import { SkeletonBlock, SkeletonCircle } from './Skeleton';
import CurrentPrescriptionCardSkeleton from '../Profile/Loading/CurrentPrescriptionCardSkeleton';

/**
 * Prescription detail placeholder: the same card the screen leads with,
 * followed by the measurement rows below it.
 */
const PrescriptionSkeleton: React.FC = () => (
  <View style={styles.root}>
    <CurrentPrescriptionCardSkeleton />

    <SkeletonBlock width={150} height={16} style={styles.sectionTitle} />

    <View style={styles.card}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={[styles.row, i > 0 && styles.rowDivided]}>
          <SkeletonCircle size={32} />
          <SkeletonBlock width="40%" height={14} style={styles.rowLabel} />
          <SkeletonBlock width={60} height={16} />
        </View>
      ))}
    </View>
  </View>
);

export default PrescriptionSkeleton;

const styles = StyleSheet.create({
  root: { padding: Spacing.md },
  sectionTitle: { marginTop: Spacing.lg, marginBottom: Spacing.md },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    ...Shadow.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  rowDivided: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  rowLabel: { flex: 1, marginLeft: Spacing.md },
});
