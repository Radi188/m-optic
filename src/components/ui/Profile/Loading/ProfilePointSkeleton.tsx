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
    <View style={styles.card}>
      <View style={styles.leftContent}>
        {/* Title row */}
        <View style={styles.titleRow}>
          <Animated.View style={[styles.iconSkeleton, { backgroundColor }]} />
          <Animated.View
            style={[styles.textSkeletonShort, { backgroundColor }]}
          />
        </View>

        {/* Points */}
        <Animated.View
          style={[
            styles.textSkeletonLong,
            { height: 28, marginTop: 12, backgroundColor },
          ]}
        />

        {/* Description */}
        <Animated.View
          style={[
            styles.textSkeletonLong,
            { height: 16, marginTop: 6, backgroundColor },
          ]}
        />

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: '40%', backgroundColor }]}
          />
        </View>
      </View>
    </View>
  );
};

export default ProfilePointSectionSkeleton;

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.lg,
    borderRadius: 28,
    padding: Spacing.lg,
    minHeight: 150,
    backgroundColor: '#E0DFDD',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftContent: {
    flex: 1,
    paddingRight: Spacing.sm,
    maxWidth: 220,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconSkeleton: {
    width: 23,
    height: 23,
    borderRadius: 12,
  },
  textSkeletonShort: {
    width: 120,
    height: 18,
    borderRadius: 8,
    marginLeft: 10,
  },
  textSkeletonLong: {
    width: '80%',
    borderRadius: 8,
  },
  progressTrack: {
    marginTop: 16,
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: '#CFCBC7',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  cardImageSkeleton: {
    position: 'absolute',
    right: 8,
    top: 35,
    width: 150,
    height: 105,
    borderRadius: 16,
    transform: [{ rotate: '2deg' }, { scale: 1.2 }],
  },
});
