import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

import { Colors } from '../../theme';
import AppText from '../AppText';
import LockedPrice from './LockedPrice';
import DiscountBadge from './DiscountBadge';
import { formatPrice } from '../../utils/formatPrice';
import { usePriceVisible } from '../../utils/priceGate';
import type { Pricing } from '../../utils/salePrice';

type Props = {
  pricing: Pricing;
  /** The main price's text style — each screen keeps its own size and colour. */
  priceStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  /** `lg` for the product page; `sm` for cards and lists. */
  size?: 'sm' | 'lg';
  /** Leave out the struck-through regular price. */
  hideOriginal?: boolean;
  /**
   * Leave out the discount badge — for a screen that shows it in a fixed spot
   * of its own, so it does not move when signing in swaps the lock for prices.
   */
  hideDiscount?: boolean;
};

/**
 * A product price, with its sale when there is one:
 *
 *   $80   $100 (struck through)   -20%
 *
 * Renders nothing when there is no price at all. Signed out, the amounts are
 * replaced by "Log in to see price" (tap → Login); the discount badge stays,
 * since a sale is a reason to sign in.
 */
const PriceTag: React.FC<Props> = ({
  pricing,
  priceStyle,
  style,
  size = 'sm',
  hideOriginal = false,
  hideDiscount = false,
}) => {
  const visible = usePriceVisible();
  if (pricing.price === null) return null;
  const large = size === 'lg';

  return (
    <View style={[styles.row, style]}>
      {visible ? (
        <AppText style={priceStyle}>{formatPrice(pricing.price)}</AppText>
      ) : (
        <LockedPrice
          textStyle={large && styles.lockedLarge}
          iconSize={large ? 14 : 12}
        />
      )}

      {visible && !hideOriginal && pricing.originalPrice !== null && (
        <AppText style={[styles.original, large && styles.originalLarge]}>
          {formatPrice(pricing.originalPrice)}
        </AppText>
      )}

      {!hideDiscount && (
        <DiscountBadge percent={pricing.discountPercentage} size={size} />
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
  lockedLarge: { fontSize: 14 },
});
