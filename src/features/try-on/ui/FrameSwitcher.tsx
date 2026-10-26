import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import AppText from '../../../components/AppText';
import { Colors, FontSize, Spacing } from '../../../theme';

export interface SwitcherOption {
  key: string;
  label: string;
  hex: string | null;
}

type Props = {
  options: SwitcherOption[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

/**
 * One swatch per colourway that has its own try-on model. Switching swaps the
 * GLB inside the running try-on; the camera keeps going.
 */
const FrameSwitcher: React.FC<Props> = ({ options, selectedKey, onSelect }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.row}
  >
    {options.map(o => {
      const active = o.key === selectedKey;
      return (
        <TouchableOpacity
          key={o.key}
          style={[styles.chip, active && styles.chipActive]}
          activeOpacity={0.8}
          onPress={() => onSelect(o.key)}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
          accessibilityLabel={o.label}
        >
          <View style={[styles.swatch, { backgroundColor: o.hex ?? Colors.gray300 }]} />
          {!!o.label && (
            <AppText style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {o.label}
            </AppText>
          )}
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

export default FrameSwitcher;

const styles = StyleSheet.create({
  row: { gap: Spacing.sm, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 180,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  label: { flexShrink: 1, fontSize: FontSize.xs, fontWeight: '600', color: Colors.gray600 },
  labelActive: { color: Colors.primary, fontWeight: '700' },
});
