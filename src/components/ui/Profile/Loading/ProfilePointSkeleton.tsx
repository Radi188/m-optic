import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Spacing } from '../../../../theme';

const ProfilePointSectionSkeleton: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  const backgroundColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#CFCBC7', '#E0DFDD'], // pulsing effect
  });

  return (
    <View style={styles.block}>
      {/* Mirrors the loaded layout: medallion + tier name on one row with the
          points figure at the right, then the bar and its caption. */}
      <View style={styles.topRow}>
        <Animated.View style={[styles.medallion, { backgroundColor }]} />
        <Animated.View style={[styles.tierName, { backgroundColor }]} />
        <Animated.View style={[styles.points, { backgroundColor }]} />
      </View>

      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, { width: '40%', backgroundColor }]}
        />
      </View>

      <Animated.View style={[styles.caption, { backgroundColor }]} />
    </View>
  );
};

export default ProfilePointSectionSkeleton;

const styles = StyleSheet.create({
  block: {
    marginTop: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EBE7E3',
    backgroundColor: '#F4F2F0',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  medallion: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  tierName: {
    flex: 1,
    height: 16,
    borderRadius: 8,
    maxWidth: 120,
  },
  points: {
    width: 70,
    height: 18,
    borderRadius: 8,
  },
  track: {
    marginTop: 12,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#DFDCD9',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  caption: {
    marginTop: 9,
    width: '60%',
    height: 11,
    borderRadius: 6,
  },
});
