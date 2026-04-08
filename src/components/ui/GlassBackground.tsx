import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, OrbColors } from '../../theme';

interface GlassBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * GlassBackground — the warm parchment canvas with soft color orbs.
 *
 * Creates the layered depth that makes glass surfaces "pop".
 * Use as the root container for every screen.
 */
const GlassBackground: React.FC<GlassBackgroundProps> = ({ children, style }) => (
  <View style={[styles.root, style]}>
    {/* Warm orb — top-left */}
    <View style={[styles.orb, styles.orb1]} pointerEvents="none" />
    {/* Warm peach orb — bottom-right */}
    <View style={[styles.orb, styles.orb2]} pointerEvents="none" />
    {/* Soft center glow */}
    <View style={[styles.orb, styles.orb3]} pointerEvents="none" />
    {children}
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orb1: {
    width: 340,
    height: 340,
    top: -80,
    left: -80,
    backgroundColor: OrbColors.orb1,
  },
  orb2: {
    width: 280,
    height: 280,
    bottom: 80,
    right: -60,
    backgroundColor: OrbColors.orb2,
  },
  orb3: {
    width: 200,
    height: 200,
    top: '40%',
    left: '30%',
    backgroundColor: OrbColors.orb3,
  },
});

export default GlassBackground;
