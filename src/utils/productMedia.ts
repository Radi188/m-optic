/**
 * Reading media and measurements out of a product payload.
 *
 * Two things about GET /products/{id} drive everything here:
 *
 *  1. `assets` mixes photos with the 3-D model — a .glb sits in the same array
 *     as the .avif gallery shots. Anything feeding an <Image> has to filter on
 *     type 'gallery' or it will try to draw the model as a picture.
 *  2. The parent product usually has an EMPTY `assets` array and no colour. The
 *     real gallery, colour and 3-D model live on each entry of `variations`, so
 *     the screen picks a colourway first and reads media from that.
 */
import type {
  Asset,
  Measurements,
  Product,
  ProductVariation,
} from '../types/glasses';

const isGallery = (a: Asset) =>
  a.type === 'gallery' || (!a.type && a.format !== 'glb');

/**
 * Photo URLs for a product or variation, best first.
 * Falls back to the single `image` when there is no gallery.
 */
export function galleryImages(product?: Product | null): string[] {
  if (!product) return [];

  const gallery = (product.assets ?? [])
    .filter(isGallery)
    .map(a => a.url)
    .filter(Boolean);

  if (gallery.length) {
    // `image` is the catalogue thumbnail and is usually also the first gallery
    // shot; lead with it when it is a distinct photo.
    return product.image && !gallery.includes(product.image)
      ? [product.image, ...gallery]
      : gallery;
  }

  return product.image ? [product.image] : [];
}

/** The .glb for a product or variation, if one has been uploaded. */
export function modelUrl(product?: Product | null): string | null {
  const asset = (product?.assets ?? []).find(
    a => a.type === '3d_model' || a.format === 'glb',
  );
  return asset?.url ?? null;
}

export interface ColorOption {
  id: string;
  hex: string;
  label: string;
  variation: ProductVariation;
}

/**
 * One swatch per colourway. Colours have no `name` in this API, only a
 * `hex_code` and the shop's `color_code`, so the code is the label.
 */
export function colorOptions(product?: Product | null): ColorOption[] {
  return (product?.variations ?? [])
    .filter(v => v.color?.hex_code)
    .map(v => ({
      id: String(v.id),
      hex: v.color!.hex_code,
      label: v.color?.name || v.color_code || '',
      variation: v,
    }));
}

/** Parent price plus this colourway's adjustment. */
export function variationPrice(
  product: Product,
  variation?: ProductVariation | null,
): number {
  const base = Number(product.price ?? 0);
  return base + Number(variation?.price_adjustment ?? 0);
}

/**
 * Industry shorthand for frame dimensions: lens width, bridge, temple length.
 * Returns null when the API has not filled the measurements in.
 */
export function measurementLabel(m?: Measurements | null): string | null {
  if (!m) return null;
  const { lens_width, bridge_size, temple_length } = m;
  if (lens_width == null || bridge_size == null || temple_length == null) {
    return null;
  }
  return `${lens_width}–${bridge_size}–${temple_length}`;
}

/**
 * Coarse size from the frame's total width (hinge to hinge, in mm). Thresholds
 * follow the usual optical retail bands. Returns null rather than guessing when
 * the measurement is missing.
 */
export function frameSizeName(m?: Measurements | null): string | null {
  const width = m?.hinge_to_hinge;
  if (width == null) return null;
  if (width < 128) return 'Small';
  if (width <= 138) return 'Medium';
  return 'Large';
}
