import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { BorderRadius, Colors, Spacing } from '../../../theme';

const { width } = Dimensions.get('window');
const CARD_GAP = Spacing.xs;
const CARD_WIDTH = (width - Spacing.lg * 2 - CARD_GAP) / 2;

const GlassScreenSkeleton: React.FC = () => {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  const animatedStyle = {
    opacity,
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <Animated.View style={[styles.searchBar, animatedStyle]} />

      <View style={styles.tabsRow}>
        {[1, 2, 3, 4].map(item => (
          <Animated.View key={item} style={[styles.tab, animatedStyle]} />
        ))}
      </View>

      <Animated.View style={[styles.countLine, animatedStyle]} />

      <View style={styles.grid}>
        {[1, 2, 3, 4, 5, 6].map(item => (
          <View key={item} style={styles.card}>
            <Animated.View style={[styles.image, animatedStyle]} />
            <Animated.View style={[styles.lineSm, animatedStyle]} />
            <Animated.View style={[styles.lineXs, animatedStyle]} />
            <Animated.View style={[styles.price, animatedStyle]} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  searchBar: {
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray200,
    marginBottom: Spacing.md,
  },

  tabsRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },

  tab: {
    width: 82,
    height: 35,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray200,
    marginRight: 10,
  },

  countLine: {
    width: 120,
    height: 12,
    borderRadius: 999,
    backgroundColor: Colors.gray200,
    marginBottom: Spacing.md,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  card: {
    width: CARD_WIDTH,
    marginBottom: CARD_GAP,
  },

  image: {
    width: '100%',
    aspectRatio: 0.78,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.gray200,
    marginBottom: Spacing.sm,
  },

  lineSm: {
    width: '80%',
    height: 12,
    borderRadius: 999,
    backgroundColor: Colors.gray200,
    marginBottom: 8,
  },

  lineXs: {
    width: '55%',
    height: 10,
    borderRadius: 999,
    backgroundColor: Colors.gray200,
    marginBottom: 10,
  },

  price: {
    width: '35%',
    height: 14,
    borderRadius: 999,
    backgroundColor: Colors.gray200,
  },
});

export default GlassScreenSkeleton;
