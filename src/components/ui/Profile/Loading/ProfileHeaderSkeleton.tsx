import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Spacing } from '../../../../theme';

const ProfileHeaderSkeleton: React.FC = () => {
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
    outputRange: ['#CFCBC7', '#E0DFDD'], // light <-> dark pulse
  });

  return (
    <View style={styles.container}>
      {/* Avatar Skeleton */}
      <Animated.View style={[styles.avatarSkeleton, { backgroundColor }]} />

      {/* Text Skeletons */}
      <View style={styles.textSkeletonContainer}>
        <Animated.View
          style={[
            styles.textSkeleton,
            { width: 140, height: 20, marginBottom: 8, backgroundColor },
          ]}
        />
        <Animated.View
          style={[
            styles.textSkeleton,
            { width: 100, height: 16, backgroundColor },
          ]}
        />
      </View>
    </View>
  );
};

export default ProfileHeaderSkeleton;

const styles = StyleSheet.create({
  container: {
    height: 140,
    backgroundColor: '#E0DFDD',
    borderRadius: 28,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarSkeleton: {
    width: 86,
    height: 86,
    borderRadius: 43,
    marginRight: Spacing.lg,
  },
  textSkeletonContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  textSkeleton: {
    borderRadius: 8,
  },
  badgeSkeleton: {
    width: 80,
    height: 28,
    borderRadius: 14,
    marginLeft: Spacing.sm,
  },
});
