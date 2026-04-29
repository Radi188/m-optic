import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../theme';

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
    {children}
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
});

export default GlassBackground;
