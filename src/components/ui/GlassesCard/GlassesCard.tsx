import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import FaceIdIcon from '../../../assets/svg/face-id.svg';
import { Colors } from '../../../theme';
import { Product } from '../../../types/glasses';
import AppText from '../../AppText';
import AppImage from '../../AppImage';
import { useFavorite } from '../../../hook/useFavorite';
import { productPricing } from '../../../utils/salePrice';
import PriceTag from '../PriceTag';
import DiscountBadge from '../DiscountBadge';

const FAVORITE_RED = '#E5484D';

type Props = {
  item: Product;
  onPress: () => void;
  onTryOn: () => void;
};

const GlassCard: React.FC<Props> = ({ item, onPress, onTryOn }) => {
  // Saved to My Favorites (persisted on the device).
  const { isFavorite, toggle: toggleFavorite } = useFavorite(item);

  // The list endpoint (GET /products) returns lighter field names than the
  // detail endpoint, so fall back across both shapes.
  const name = item.item_name || item.name;
  const pricing = productPricing(item);
  const brand = item.category_name || item.brand?.name || '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Image */}
      <View style={styles.imageWrap}>
        <AppImage
          source={{ uri: item.image }}
          style={styles.image}
          resizeMode="contain"
        />

        {/* Sale badge: fixed on the image (top-left, like the product page),
            so it does not move when signing in reveals the price. */}
        <DiscountBadge percent={pricing.discountPercentage} style={styles.discount} />

        {/* Heart Icon */}
        <TouchableOpacity
          style={styles.heartIcon}
          onPress={toggleFavorite}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ selected: isFavorite }}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorite ? FAVORITE_RED : Colors.gray700}
          />
        </TouchableOpacity>

        {/* Try-On Button */}
        <TouchableOpacity style={styles.tryOnIcon} onPress={onTryOn}>
          <FaceIdIcon width={18} height={18} fill={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.content}>
        <AppText style={styles.name} numberOfLines={1}>
          {name?.trim()}
        </AppText>
        <AppText style={styles.brand}>{brand}</AppText>

        {/* Signed out, PriceTag shows "Log in to see price" itself. */}
        <PriceTag pricing={pricing} priceStyle={styles.price} hideDiscount />
      </View>
    </TouchableOpacity>
  );
};

export default GlassCard;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6, // spacing between columns
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
  },

  imageWrap: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },

  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },

  content: {
    padding: 12,
  },

  brand: {
    fontSize: 12,
    color: '#888',
  },

  tryOnIcon: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },

  discount: {
    position: 'absolute',
    top: 10,
    left: 10,
  },

  heartIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },

  name: {
    fontSize: 15,
    fontWeight: '600',
    marginVertical: 4,
  },

  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#b09080',
    marginVertical: 4,
  },

  tryOnBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(176,144,128,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  tryOnText: {
    color: '#fff',
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '600',
  },
});
