import type { Product, ProductVariation } from '../types/glasses';

/**
 * Sale pricing, as the API defines it (product-sale-price-api.md):
 *
 *   on_sale = true   →   sale_price   price (struck through)   -discount%
 *   on_sale = false  →   price
 *
 * `on_sale` alone decides the layout. The backend has already weighed the
 * product's sale price against its own and its category's "show on mobile"
 * settings, so `price` and `sale_price` are never compared here.
 */

/** The sale fields, in either the list or the detail shape of a product. */
export type SaleFields = {
  price?: number | string | null;
  /** GET /products sends the regular price under this name instead. */
  item_price?: number | string | null;
  on_sale?: boolean | null;
  sale_price?: number | string | null;
  discount_percentage?: number | string | null;
};

export type Pricing = {
  /** What the customer pays — the big number. Null when there is no price. */
  price: number | null;
  /** Regular price, struck through. Null when not on sale. */
  originalPrice: number | null;
  /** Percent off for the badge. Null when not on sale or not supplied. */
  discountPercentage: number | null;
};

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export function productPricing(product?: SaleFields | null): Pricing {
  const regular = toNumber(product?.item_price ?? product?.price);
  const sale = toNumber(product?.sale_price);

  // A sale flagged without a sale price has nothing to show, so it falls
  // back to the regular price rather than rendering an empty number.
  if (product?.on_sale === true && sale !== null) {
    const percent = toNumber(product.discount_percentage);
    return {
      price: sale,
      originalPrice: regular,
      discountPercentage: percent !== null && percent > 0 ? percent : null,
    };
  }

  return { price: regular, originalPrice: null, discountPercentage: null };
}

/**
 * The selected colourway's pricing. Each variation carries its own `price`
 * and sale fields, and those win over the parent's. A variation from an older
 * response without its own price falls back to parent price + adjustment.
 */
export function variationPricing(
  product: Product,
  variation?: ProductVariation | null,
): Pricing {
  if (!variation) return productPricing(product);
  if (toNumber(variation.price) !== null) return productPricing(variation);

  const base = toNumber(product.price) ?? 0;
  return {
    price: base + (toNumber(variation.price_adjustment) ?? 0),
    originalPrice: null,
    discountPercentage: null,
  };
}
