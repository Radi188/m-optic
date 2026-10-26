import { productPricing, variationPricing } from '../src/utils/salePrice';
import type { Product, ProductVariation } from '../src/types/glasses';

describe('productPricing', () => {
  it('shows the sale price, the struck regular price and the badge when on sale', () => {
    expect(
      productPricing({ price: 100, on_sale: true, sale_price: 80, discount_percentage: 20 }),
    ).toEqual({ price: 80, originalPrice: 100, discountPercentage: 20 });
  });

  it('shows only the regular price when not on sale', () => {
    expect(
      productPricing({ price: 120, on_sale: false, sale_price: null, discount_percentage: null }),
    ).toEqual({ price: 120, originalPrice: null, discountPercentage: null });
  });

  it('trusts on_sale rather than comparing the two prices', () => {
    // A sale_price is present but the backend says not to show it here.
    expect(productPricing({ price: 100, on_sale: false, sale_price: 80 }).price).toBe(100);
  });

  it('falls back to the regular price when a sale has no sale price', () => {
    expect(productPricing({ price: 100, on_sale: true, sale_price: null })).toEqual({
      price: 100,
      originalPrice: null,
      discountPercentage: null,
    });
  });

  it('reads the list endpoint shape, where the regular price is item_price', () => {
    expect(
      productPricing({ item_price: '100.00', on_sale: true, sale_price: '80.00', discount_percentage: '20' }),
    ).toEqual({ price: 80, originalPrice: 100, discountPercentage: 20 });
  });

  it('keeps the sale but drops a missing badge', () => {
    expect(productPricing({ price: 100, on_sale: true, sale_price: 90 })).toEqual({
      price: 90,
      originalPrice: 100,
      discountPercentage: null,
    });
  });

  it('copes with older responses that have no sale fields', () => {
    expect(productPricing({ price: 75 })).toEqual({
      price: 75,
      originalPrice: null,
      discountPercentage: null,
    });
    expect(productPricing(null).price).toBeNull();
  });
});

describe('variationPricing', () => {
  const parent = { price: 100, on_sale: true, sale_price: 80, discount_percentage: 20 } as Product;

  it("uses the selected variant's own sale, not the parent's", () => {
    const variant = {
      price: 110,
      on_sale: true,
      sale_price: 88,
      discount_percentage: 20,
      price_adjustment: 10,
    } as ProductVariation;
    expect(variationPricing(parent, variant)).toEqual({
      price: 88,
      originalPrice: 110,
      discountPercentage: 20,
    });
  });

  it('uses the parent when no variant is selected', () => {
    expect(variationPricing(parent, null).price).toBe(80);
  });

  it('falls back to parent price + adjustment for a variant without its own price', () => {
    const variant = { price_adjustment: 10 } as unknown as ProductVariation;
    expect(variationPricing({ price: 100 } as Product, variant)).toEqual({
      price: 110,
      originalPrice: null,
      discountPercentage: null,
    });
  });
});
