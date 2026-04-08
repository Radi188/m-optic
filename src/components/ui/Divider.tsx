import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, FontSize } from '../../theme';

interface DividerProps {
  label?: string;
  style?: ViewStyle;
  color?: string;
}

const Divider: React.FC<DividerProps> = ({
  label,
  style,
  color = Colors.divider,
}) => {
  if (label) {
    return (
      <View style={[styles.row, style]}>
        <View style={[styles.line, { backgroundColor: color }]} />
        <View style={styles.labelWrap}>
          <Text style={styles.label}>{label}</Text>
        </View>
        <View style={[styles.line, { backgroundColor: color }]} />
      </View>
    );
  }
  return <View style={[styles.divider, { backgroundColor: color }, style]} />;
};

const styles = StyleSheet.create({
  divider: { height: 1, width: '100%', marginVertical: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  line: { flex: 1, height: 1 },
  labelWrap: {
    marginHorizontal: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    backgroundColor: Colors.glassSurfaceMid,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});

export default Divider;
