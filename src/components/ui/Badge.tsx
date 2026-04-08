import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, FontSize } from '../../theme';

type BadgeVariant = 'primary' | 'success' | 'error' | 'warning' | 'info' | 'neutral';

const BADGE_COLORS: Record<BadgeVariant, { bg: string; border: string; text: string; dot: string }> = {
  primary: {
    bg:     'rgba(156, 129, 120, 0.14)',
    border: 'rgba(156, 129, 120, 0.40)',
    text:   Colors.primary,
    dot:    Colors.primary,
  },
  success: {
    bg:     'rgba(45,  189, 126, 0.13)',
    border: 'rgba(45,  189, 126, 0.40)',
    text:   Colors.success,
    dot:    Colors.success,
  },
  error: {
    bg:     'rgba(240, 82,  82,  0.13)',
    border: 'rgba(240, 82,  82,  0.40)',
    text:   Colors.error,
    dot:    Colors.error,
  },
  warning: {
    bg:     'rgba(247, 164, 64,  0.13)',
    border: 'rgba(247, 164, 64,  0.40)',
    text:   Colors.warning,
    dot:    Colors.warning,
  },
  info: {
    bg:     'rgba(77,  168, 218, 0.13)',
    border: 'rgba(77,  168, 218, 0.40)',
    text:   Colors.info,
    dot:    Colors.info,
  },
  neutral: {
    bg:     'rgba(175, 160, 153, 0.14)',
    border: 'rgba(175, 160, 153, 0.40)',
    text:   Colors.gray600,
    dot:    Colors.gray400,
  },
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  dot?: boolean;
}

const Badge: React.FC<BadgeProps> = ({ label, variant = 'primary', style, dot }) => {
  const cfg = BADGE_COLORS[variant];
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: cfg.bg,
          borderColor:     cfg.border,
        },
        style,
      ]}
    >
      {/* Glass top-edge highlight */}
      <View style={styles.highlight} pointerEvents="none" />

      {dot && <View style={[styles.dot, { backgroundColor: cfg.dot }]} />}
      <Text style={[styles.label, { color: cfg.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.80)',
    zIndex: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default Badge;
