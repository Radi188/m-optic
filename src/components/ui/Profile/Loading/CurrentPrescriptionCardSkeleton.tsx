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
    outputRange: ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.20)'],
  });

  return (
    <View style={styles.card}>
      {/* Mirrors the loaded card: header row, then the inset readings panel. */}
      <View style={styles.header}>
        <Animated.View style={[styles.iconSkeleton, { backgroundColor }]} />
        <Animated.View style={[styles.titleSkeleton, { backgroundColor }]} />
      </View>

      <View style={styles.readingsPanel}>
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
    marginTop: Spacing.md,
    backgroundColor: '#3A2A20',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(227,183,120,0.16)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  iconSkeleton: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  titleSkeleton: {
    width: 148,
    height: 15,
    borderRadius: 7,
  },
  readingsPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  eyeBlock: {
    flex: 1,
    alignItems: 'center',
  },
  labelSkeleton: {
    width: 74,
    height: 11,
    borderRadius: 5,
    marginBottom: 9,
  },
  valueSkeleton: {
    width: 92,
    height: 23,
    borderRadius: 7,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
});
