import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing, BorderRadius } from '../../../theme';
import { SkeletonBlock, SkeletonCircle } from './Skeleton';

/**
 * Store screen placeholder: the branch tabs across the top and the detail
 * sheet at the bottom, over a flat stand-in for the map.
 */
const StoreSkeleton: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View style={styles.map} />

      <View style={[styles.tabsArea, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.tabsRow}>
          {[120, 96, 108].map((width, i) => (
            <SkeletonBlock
              key={i}
              width={width}
              height={38}
              radius={BorderRadius.full}
              style={styles.tab}
            />
          ))}
        </View>
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.handle} />

        <View style={styles.sheetHeader}>
          <SkeletonCircle size={48} />
          <View style={styles.sheetHeaderText}>
            <SkeletonBlock width="70%" height={18} />
            <SkeletonBlock width="45%" height={13} style={styles.gap} />
          </View>
        </View>

        <SkeletonBlock height={13} style={styles.gapLg} />
        <SkeletonBlock width="80%" height={13} style={styles.gap} />

        <View style={styles.actions}>
          <SkeletonBlock height={44} radius={BorderRadius.full} style={styles.action} />
          <SkeletonBlock height={44} radius={BorderRadius.full} style={styles.action} />
        </View>
      </View>
    </View>
  );
};

export default StoreSkeleton;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1, backgroundColor: Colors.backgroundDeep },

  tabsArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
  },
  tabsRow: { flexDirection: 'row' },
  tab: { marginRight: Spacing.sm },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray200,
    marginBottom: Spacing.lg,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center' },
  sheetHeaderText: { flex: 1, marginLeft: Spacing.md },
  gap: { marginTop: Spacing.sm },
  gapLg: { marginTop: Spacing.lg },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  action: { flex: 1 },
});
