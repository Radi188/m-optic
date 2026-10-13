import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../theme';
import AppText from '../AppText';

type ActiveFilters = {
  brand?: unknown;
  frame?: unknown;
  minPrice?: unknown;
  maxPrice?: unknown;
};

const isSet = (value: unknown) =>
  value !== undefined && value !== null && value !== '' && value !== 'all';

/** Brand, frame shape and price each count once; min/max share one slot. */
export const countActiveFilters = ({
  brand,
  frame,
  minPrice,
  maxPrice,
}: ActiveFilters) =>
  Number(isSet(brand)) +
  Number(isSet(frame)) +
  Number(isSet(minPrice) || isSet(maxPrice));

/**
 * Count bubble pinned to the top-right of a filter button, so the customer
 * can see the list is filtered. Renders nothing when no filter is on.
 */
const FilterBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count <= 0) return null;

  return (
    <View style={styles.badge} pointerEvents="none">
      <AppText style={styles.text}>{count}</AppText>
    </View>
  );
};

export default FilterBadge;

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    color: Colors.white,
  },
});
