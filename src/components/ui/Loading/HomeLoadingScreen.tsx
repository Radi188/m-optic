import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../../../theme';

const SkeletonBox = ({ style }: { style?: any }) => (
  <View style={[styles.skeleton, style]} />
);

const HomeSkeleton = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
          <View style={styles.heroHeader}>
            <View style={styles.logoRow}>
              <SkeletonBox style={styles.logo} />
              <SkeletonBox style={styles.brandName} />
            </View>
            <SkeletonBox style={styles.signInBtn} />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <SkeletonBox style={styles.sectionTitle} />
            <SkeletonBox style={styles.seeAll} />
          </View>

          <View style={styles.productRow}>
            {[1, 2, 3].map(item => (
              <View key={item} style={styles.productCard}>
                <SkeletonBox style={styles.productImage} />
                <SkeletonBox style={styles.brandText} />
                <SkeletonBox style={styles.productName} />
                <View style={styles.priceRow}>
                  <SkeletonBox style={styles.price} />
                  <SkeletonBox style={styles.tryOnBtn} />
                </View>
              </View>
            ))}
          </View>

          <SkeletonBox style={styles.brandsTitle} />

          <View style={styles.brandRow}>
            {[1, 2, 3].map(item => (
              <SkeletonBox key={item} style={styles.brandCard} />
            ))}
          </View>

          <SkeletonBox style={styles.frameTitle} />

          <View style={styles.frameRow}>
            {[1, 2, 3].map(item => (
              <SkeletonBox key={item} style={styles.frameCard} />
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
        {[1, 2, 3, 4, 5].map(item => (
          <View key={item} style={styles.navItem}>
            <SkeletonBox style={styles.navIcon} />
            <SkeletonBox style={styles.navText} />
          </View>
        ))}
      </View>
    </View>
  );
};

export default HomeSkeleton;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  skeleton: {
    backgroundColor: '#EFE9E6',
    opacity: 0.9,
  },
  hero: {
    height: 430,
    backgroundColor: '#EFE9E6',
    paddingHorizontal: Spacing.lg,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#E0D7D2',
  },
  brandName: {
    width: 92,
    height: 18,
    borderRadius: BorderRadius.full,
    backgroundColor: '#E0D7D2',
  },
  signInBtn: {
    width: 118,
    height: 42,
    borderRadius: BorderRadius.full,
    backgroundColor: '#E0D7D2',
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 120,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    width: 145,
    height: 24,
    borderRadius: BorderRadius.sm,
  },
  seeAll: {
    width: 62,
    height: 18,
    borderRadius: BorderRadius.sm,
  },
  productRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  productCard: {
    width: 175,
  },
  productImage: {
    width: 175,
    height: 165,
    borderRadius: 16,
  },
  brandText: {
    width: 70,
    height: 14,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  productName: {
    width: 130,
    height: 20,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  price: {
    width: 52,
    height: 20,
    borderRadius: BorderRadius.sm,
  },
  tryOnBtn: {
    width: 88,
    height: 32,
    borderRadius: BorderRadius.full,
  },
  brandsTitle: {
    width: 90,
    height: 24,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xl,
  },
  brandRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  brandCard: {
    width: 165,
    height: 100,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#EFE9E6',
    ...Shadow.sm,
  },
  frameTitle: {
    width: 135,
    height: 24,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xl,
  },
  frameRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  frameCard: {
    width: 160,
    height: 110,
    borderRadius: 18,
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 92,
    backgroundColor: '#F8F1EE',
    borderTopWidth: 1,
    borderTopColor: '#EFE4DF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.sm,
  },
  navItem: {
    alignItems: 'center',
    gap: 6,
  },
  navIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  navText: {
    width: 42,
    height: 12,
    borderRadius: BorderRadius.sm,
  },
});
