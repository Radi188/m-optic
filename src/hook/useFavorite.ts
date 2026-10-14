import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  selectIsFavorite,
  toggleFavorite,
} from '../store/slices/favoritesSlice';
import type { Product } from '../types/glasses';

/**
 * Saved state for one frame, plus a toggle. Accepts the list or the detail
 * shape of a product — the list endpoint uses lighter field names
 * (item_name, item_price, category_name), so both are read.
 *
 * @param image Optional photo to save instead of `product.image`, e.g. the
 *   colourway the shopper is looking at on the product page.
 */
export function useFavorite(product?: Product | null, image?: string | null) {
  const dispatch = useAppDispatch();
  const id = product ? String(product.id) : '';
  const isFavorite = useAppSelector(selectIsFavorite(id));

  const toggle = useCallback(() => {
    if (!product) return;
    const price = product.item_price ?? product.price;
    dispatch(
      toggleFavorite({
        id: String(product.id),
        name: product.item_name || product.name || '',
        brand: product.category_name || product.brand?.name || '',
        price: price === undefined || price === null ? null : Number(price),
        image: image || product.image || null,
      }),
    );
  }, [dispatch, image, product]);

  return { isFavorite: !!product && isFavorite, toggle };
}
