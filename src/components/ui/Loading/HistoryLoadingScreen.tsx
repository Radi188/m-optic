import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '../../../theme';
import { SkeletonBlock, SkeletonCircle } from './Skeleton';

/**
 * History list placeholder — three cards shaped like the prescription card the
 * refractions tab renders.
 */
const HistorySkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <View style={styles.list}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={styles.card}>
        <View style={styles.header}>
          <SkeletonCircle size={40} />
          <SkeletonBlock width={120} height={18} style={styles.title} />
          <SkeletonBlock width={70} height={13} />
        </View>

        <View style={styles.valueRow}>
          <View style={styles.eyeBlock}>
            <SkeletonBlock width={70} height={14} />
            <SkeletonBlock width={54} height={22} style={styles.value} />
          </View>

          <View style={styles.divider} />

          <View style={styles.eyeBlock}>
            <SkeletonBlock width={70} height={14} />
            <SkeletonBlock width={54} height={22} style={styles.value} />
          </View>
        </View>
      </View>
    ))}
  </View>
);

export default HistorySkeleton;

const styles = StyleSheet.create({
  list: { paddingHorizontal: Spacing.md },
  card: {
    backgroundColor: '#F5ECE6',
    borderRadius: 32,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#EFE2DA',
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { flex: 1, marginLeft: 12, marginRight: Spacing.sm },
  valueRow: { flexDirection: 'row', alignItems: 'flex-start' },
  eyeBlock: { flex: 1 },
  value: { marginTop: 8 },
  divider: {
    width: 1,
    height: 45,
    backgroundColor: '#E5D6CD',
    marginHorizontal: 24,
    marginTop: 8,
  },
});
