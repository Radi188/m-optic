import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

import { Colors } from '../../theme';
import AppText from '../AppText';
import { formatPrice } from '../../utils/formatPrice';
import type { Pricing } from '../../utils/salePrice';

type Props = {
  pricing: Pricing;
  /** The main price's text style — each screen keeps its own size and colour. */
  priceStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  /** `lg` for the product page; `sm` for cards and lists. */
  size?: 'sm' | 'lg';
  /**
   * Leave out the struck-through regular price — for a price that is blurred
   * for signed-out browsers, where a readable "was" price would defeat the blur.
   * The discount badge still shows.
   */
  hideOriginal?: boolean;
};

/**
 * A product price, with its sale when there is one:
 *
 *   $80   $100 (struck through)   -20%
 *
 * Renders nothing when there is no price at all.
 */
const PriceTag: React.FC<Props> = ({
  pricing,
  priceStyle,
  style,
  size = 'sm',
  hideOriginal = false,
}) => {
  if (pricing.price === null) return null;
  const large = size === 'lg';

  return (
    <View style={[styles.row, style]}>
      <AppText style={priceStyle}>{formatPrice(pricing.price)}</AppText>

      {!hideOriginal && pricing.originalPrice !== null && (
        <AppText style={[styles.original, large && styles.originalLarge]}>
          {formatPrice(pricing.originalPrice)}
        </AppText>
      )}

      {pricing.discountPercentage !== null && (
        <View style={[styles.badge, large && styles.badgeLarge]}>
          <AppText style={[styles.badgeText, large && styles.badgeTextLarge]}>
            -{pricing.discountPercentage}%
          </AppText>
        </View>
      )}
    </View>
  );
};

export default PriceTag;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 6,
    rowGap: 2,
  },
  original: {
    fontSize: 12,
    color: Colors.gray400,
    textDecorationLine: 'line-through',
  },
  originalLarge: { fontSize: 15 },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  badgeLarge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800', color: Colors.white },
  badgeTextLarge: { fontSize: 12 },
});
