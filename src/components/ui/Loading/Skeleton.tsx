import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';

/**
 * Shared placeholder primitives for the loading skeletons.
 *
 * The pulse (800ms each way, between two warm greys) is the one the hand-built
 * skeletons in this folder already used — it lives here now so every screen
 * animates in step instead of each file re-declaring it.
 */

const PULSE_FROM = '#CFCBC7';
const PULSE_TO = '#E0DFDD';
const PULSE_DURATION = 800;

/** Animated background colour driving every placeholder block. */
export function useSkeletonPulse(): Animated.AnimatedInterpolation<string> {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: PULSE_DURATION,
          // Colour cannot be driven on the native thread.
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: PULSE_DURATION,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [PULSE_FROM, PULSE_TO],
  });
}

type BlockProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** One rounded placeholder bar. */
export const SkeletonBlock: React.FC<BlockProps> = ({
  width = '100%',
  height = 14,
  radius = 8,
  style,
}) => {
  const backgroundColor = useSkeletonPulse();
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor }, style]}
    />
  );
};

/** A circular placeholder — avatars, icon chips. */
export const SkeletonCircle: React.FC<{ size: number; style?: StyleProp<ViewStyle> }> = ({
  size,
  style,
}) => <SkeletonBlock width={size} height={size} radius={size / 2} style={style} />;

/** Stacked lines of text, the last one short like a real paragraph. */
export const SkeletonLines: React.FC<{
  lines?: number;
  height?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}> = ({ lines = 3, height = 12, gap = 8, style }) => (
  <View style={style}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonBlock
        key={i}
        height={height}
        width={i === lines - 1 ? '60%' : '100%'}
        style={i > 0 ? { marginTop: gap } : undefined}
      />
    ))}
  </View>
);

export const skeletonStyles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
});
