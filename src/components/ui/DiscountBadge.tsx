import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { Colors } from '../../theme';
import AppText from '../AppText';

type Props = {
  /** Whole percent off, e.g. 10 → "-10%". Nothing renders when null. */
  percent: number | null;
  /** `lg` for the product page; `sm` for cards and lists. */
  size?: 'sm' | 'lg';
  style?: StyleProp<ViewStyle>;
};

/** The red "-10%" sale badge. Signed in or out, it reads the same. */
const DiscountBadge: React.FC<Props> = ({ percent, size = 'sm', style }) => {
  if (percent === null) return null;
  const large = size === 'lg';
  return (
    <View style={[styles.badge, large && styles.badgeLarge, style]}>
      <AppText style={[styles.text, large && styles.textLarge]}>-{percent}%</AppText>
    </View>
  );
};

export default DiscountBadge;

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  badgeLarge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  text: { fontSize: 10, fontWeight: '800', color: Colors.white },
  textLarge: { fontSize: 12 },
});
