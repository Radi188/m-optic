import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Colors, BorderRadius, Shadow } from '../../theme';

type GlassIntensity = 'ultralight' | 'light' | 'medium' | 'heavy';

interface GlassViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: GlassIntensity;
  /** Show the specular top-edge highlight */
  highlight?: boolean;
  /** Show drop shadow */
  shadow?: boolean;
  borderRadius?: number;
  /** Tint the glass with a color (rgba recommended) */
  tint?: string;
}

const SURFACES: Record<GlassIntensity, string> = {
  ultralight: 'rgba(255, 255, 255, 0.90)',
  light:      'rgba(255, 255, 255, 0.80)',
  medium:     'rgba(255, 255, 255, 0.68)',
  heavy:      'rgba(255, 255, 255, 0.52)',
};

const BORDERS: Record<GlassIntensity, string> = {
  ultralight: 'rgba(255, 255, 255, 0.96)',
  light:      'rgba(255, 255, 255, 0.88)',
  medium:     'rgba(255, 255, 255, 0.75)',
  heavy:      'rgba(255, 255, 255, 0.60)',
};

/**
 * GlassView — the foundational Liquid Glass surface.
 *
 * Simulates Apple's liquid glass aesthetic using layered semi-transparent
 * surfaces with specular highlights and warm depth shadows.
 */
const GlassView: React.FC<GlassViewProps> = ({
  children,
  style,
  intensity = 'medium',
  highlight = true,
  shadow = true,
  borderRadius = BorderRadius.xl,
  tint,
}) => {
  const r = borderRadius;

  return (
    <View
      style={[
        styles.glass,
        {
          backgroundColor: SURFACES[intensity],
          borderColor: BORDERS[intensity],
          borderRadius: r,
        },
        shadow && Shadow.md,
        style,
      ]}
    >
      {/* Optional color tint overlay */}
      {tint && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: tint, borderRadius: r },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Specular top-edge highlight — simulates light hitting the glass rim */}
      {highlight && (
        <View
          style={[styles.highlight, { borderRadius: r }]}
          pointerEvents="none"
        />
      )}

      {/* Bottom inner-edge glow — depth illusion */}
      <View
        style={[styles.bottomEdge, { borderRadius: r }]}
        pointerEvents="none"
      />

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  glass: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    zIndex: 1,
  },
  bottomEdge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.30)',
    zIndex: 1,
  },
});

export default GlassView;
