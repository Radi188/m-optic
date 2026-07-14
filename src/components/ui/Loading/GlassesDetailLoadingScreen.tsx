import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../../../theme';

const SkeletonBox = ({ style }: { style?: any }) => (
  <View style={[styles.skeleton, style]} />
);

const GlassesDetailSkeleton = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
     

      <View style={styles.hero}>
        <SkeletonBox style={styles.heroImage} />
        <View style={styles.heroButtons}>
          <SkeletonBox style={styles.heroSmallBtn} />
          <SkeletonBox style={styles.heroSmallBtn} />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.nameRow}>
          <SkeletonBox style={styles.productName} />
          <SkeletonBox style={styles.price} />
        </View>
      </View>

      <View style={styles.colorRow}>
        <SkeletonBox style={styles.colorText} />
        <SkeletonBox style={styles.colorPill} />
      </View>

      <View style={styles.section}>
        <SkeletonBox style={styles.sectionTitle} />

        <View style={styles.grid}>
          {[1, 2, 3, 4].map(item => (
            <View key={item} style={styles.detailCard}>
              <SkeletonBox style={styles.iconCircle} />
              <View style={styles.cardTextWrap}>
                <SkeletonBox style={styles.cardLabel} />
                <SkeletonBox style={styles.cardValue} />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SkeletonBox style={styles.descriptionTitle} />
        <SkeletonBox style={styles.descriptionLineLarge} />
        <SkeletonBox style={styles.descriptionLine} />
        <SkeletonBox style={styles.descriptionLine} />
        <SkeletonBox style={styles.descriptionLineShort} />
      </View>

      <View
        style={[styles.floatBar, { paddingBottom: insets.bottom + Spacing.sm }]}
      >
        <SkeletonBox style={styles.floatBtn} />
        <SkeletonBox style={styles.floatBtnOutline} />
      </View>
    </View>
  );
};

export default GlassesDetailSkeleton;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  skeleton: {
    backgroundColor: '#EFE9E6',
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.white,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
  },
  headerTitle: {
    flex: 1,
    height: 20,
    borderRadius: BorderRadius.full,
  },
  stockBadge: {
    width: 52,
    height: 26,
    borderRadius: BorderRadius.full,
  },
  hero: {
    height: 330,
    justifyContent: 'flex-end',
  },
  heroImage: {
    position: 'absolute',
    top: 65,
    alignSelf: 'center',
    width: '82%',
    height: 170,
    borderRadius: 28,
  },
  heroButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  heroSmallBtn: {
    width: 130,
    height: 48,
    borderRadius: BorderRadius.full,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    width: '62%',
    height: 42,
    borderRadius: BorderRadius.md,
  },
  price: {
    width: 78,
    height: 42,
    borderRadius: BorderRadius.md,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  colorText: {
    width: 58,
    height: 22,
    borderRadius: BorderRadius.sm,
  },
  colorPill: {
    width: 150,
    height: 58,
    borderRadius: BorderRadius.full,
  },
  sectionTitle: {
    width: 150,
    height: 24,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  detailCard: {
    width: '47%',
    height: 82,
    borderRadius: 28,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#F0E7E3',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    ...Shadow.sm,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  cardTextWrap: {
    flex: 1,
    marginLeft: Spacing.sm,
    gap: 8,
  },
  cardLabel: {
    width: '70%',
    height: 16,
    borderRadius: BorderRadius.sm,
  },
  cardValue: {
    width: '88%',
    height: 20,
    borderRadius: BorderRadius.sm,
  },
  descriptionTitle: {
    width: 120,
    height: 24,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  descriptionLineLarge: {
    width: '70%',
    height: 22,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  descriptionLine: {
    width: '100%',
    height: 18,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  descriptionLineShort: {
    width: '78%',
    height: 18,
    borderRadius: BorderRadius.sm,
  },
  floatBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderTopWidth: 1,
    borderTopColor: '#F0E7E3',
  },
  floatBtn: {
    flex: 1,
    height: 58,
    borderRadius: BorderRadius.lg,
  },
  floatBtnOutline: {
    flex: 1,
    height: 58,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#F8F4F2',
  },
});
