import React from 'react';
import {
  Text,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Colors, BorderRadius, Spacing, FontSize } from '../../theme';
import GlassView from './GlassView';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: keyof typeof Spacing;
  intensity?: 'ultralight' | 'light' | 'medium' | 'heavy';
}

const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  padding = 'md',
  intensity = 'light',
}) => {
  const scale = new Animated.Value(1);

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.975, useNativeDriver: true, speed: 30 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={1}
        >
          <GlassView
            intensity={intensity}
            borderRadius={BorderRadius.lg}
            style={[{ padding: Spacing[padding] }, style]}
          >
            {children}
          </GlassView>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <GlassView
      intensity={intensity}
      borderRadius={BorderRadius.lg}
      style={[{ padding: Spacing[padding] }, style]}
    >
      {children}
    </GlassView>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  color = Colors.primary,
  style,
}) => (
  <GlassView
    intensity="light"
    borderRadius={BorderRadius.lg}
    tint={color.replace(')', ', 0.05)').replace('rgb(', 'rgba(')}
    style={[styles.statCard, style]}
  >
    {/* Colored left accent */}
    <GlassView
      intensity="ultralight"
      borderRadius={BorderRadius.md}
      shadow={false}
      highlight={false}
      style={[styles.statIconBg, { backgroundColor: color + '25', borderColor: color + '40' }]}
    >
      {icon}
    </GlassView>
    <Animated.View style={styles.statInfo}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>

    {/* Right accent dot */}
    <GlassView
      intensity="heavy"
      borderRadius={BorderRadius.full}
      shadow={false}
      highlight={false}
      style={[styles.accentDot, { backgroundColor: color + '30', borderColor: color + '50' }]}
    />
  </GlassView>
);

const styles = StyleSheet.create({
  statCard: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconBg: {
    width: 46,
    height: 46,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  statInfo: { flex: 1 },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    marginTop: 2,
    fontWeight: '500',
  },
  accentDot: {
    width: 8,
    height: 8,
    borderWidth: 1,
  },
});

export default Card;
