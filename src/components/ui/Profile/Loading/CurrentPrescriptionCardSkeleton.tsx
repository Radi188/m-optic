import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Spacing } from '../../../../theme';

const CurrentPrescriptionCardSkeleton: React.FC = () => {
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
      {/* Top section skeleton */}
      <View style={styles.header}>
        <Animated.View style={[styles.iconSkeleton, { backgroundColor }]} />
        <Animated.View style={[styles.titleSkeleton, { backgroundColor }]} />
      </View>

      {/* Center section: Right and Left Eye */}
      <View style={styles.valueRow}>
        <View style={styles.eyeBlock}>
          <Animated.View style={[styles.labelSkeleton, { backgroundColor }]} />
          <Animated.View style={[styles.valueSkeleton, { backgroundColor }]} />
        </View>

        <View style={styles.divider} />

        <View style={styles.eyeBlock}>
          <Animated.View style={[styles.labelSkeleton, { backgroundColor }]} />
          <Animated.View style={[styles.valueSkeleton, { backgroundColor }]} />
        </View>
      </View>
    </View>
  );
};

export default CurrentPrescriptionCardSkeleton;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#E0DFDD',
    borderRadius: 32,
    padding: 16,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconSkeleton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  titleSkeleton: {
    flex: 1,
    height: 18,
    borderRadius: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eyeBlock: {
    flex: 1,
  },
  labelSkeleton: {
    width: 80,
    height: 14,
    borderRadius: 6,
    marginBottom: 6,
  },
  valueSkeleton: {
    width: 50,
    height: 22,
    borderRadius: 6,
  },
  divider: {
    width: 1,
    height: 45,
    backgroundColor: '#D6D1CB',
    marginHorizontal: 24,
    marginTop: 8,
  },
  cardImageSkeleton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 110,
    height: 100,
    borderRadius: 16,
    transform: [{ scale: 2 }],
  },
});
