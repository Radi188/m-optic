import React, { useEffect } from 'react';
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

// One driver for the whole app, not one per block. A colour cannot be animated
// on the native thread, so each running loop costs a JS frame callback of its
// own — and a loading screen mounts dozens of blocks at once, which is enough
// to make the skeletons themselves stutter. Shared, the cost is a single loop
// no matter how many placeholders are on screen, and they all pulse in step.
const pulse = new Animated.Value(0);
const pulseColor = pulse.interpolate({
  inputRange: [0, 1],
  outputRange: [PULSE_FROM, PULSE_TO],
});

let pulseLoop: Animated.CompositeAnimation | null = null;
/** How many placeholders are mounted; the loop runs only while this is > 0. */
let pulseSubscribers = 0;

/** Animated background colour driving every placeholder block. */
export function useSkeletonPulse(): Animated.AnimatedInterpolation<string> {
  useEffect(() => {
    pulseSubscribers += 1;

    if (!pulseLoop) {
      pulseLoop = Animated.loop(
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
      pulseLoop.start();
    }

    return () => {
      pulseSubscribers -= 1;
      // The last skeleton off the screen stops the loop, so nothing animates
      // behind a loaded screen.
      if (pulseSubscribers === 0) {
        pulseLoop?.stop();
        pulseLoop = null;
        pulse.setValue(0);
      }
    };
  }, []);

  return pulseColor;
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
