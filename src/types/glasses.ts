export interface Category {
  id: number;
  name: string | null;
}

export interface Brand {
  id: number;
  name: string;
}

export interface Color {
  id: number;
  name: string | null;
  hex_code: string;
}

export interface FrameShape {
  id: number;
  name: string;
}

export interface Material {
  id: number;
  name: string;
}

/**
 * `type` matters: a product's `assets` array mixes photos with the 3-D model, so
 * anything rendering a gallery MUST filter on 'gallery' or it will try to draw
 * a .glb as an <Image>.
 */
export type AssetType = 'gallery' | '3d_model' | string;

export interface Asset {
  id: number;
  url: string;
  type: AssetType | null;
  format?: string | null;
}

/** Frame dimensions, in millimetres. */
export interface Measurements {
  hinge_to_hinge: number | null;
  lens_width: number | null;
  lens_height: number | null;
  bridge_size: number | null;
  temple_length: number | null;
}

/**
 * A colourway of a product. Carries its own image, gallery and 3-D model — the
 * parent product's `assets` is typically empty, so the media a shopper actually
 * sees lives here.
 */
export interface ProductVariation extends Product {
  variation_id: number;
  color_code: string | null;
  sku: string | null;
  spec: string | null;
  barcode: string | null;
  /** Added to the parent price to get this colourway's price. */
  price_adjustment: number;
}

export interface Product {
  id: number;
  item_code: string;
  name: string;
  description: string | null;
  price: number;
  // ── List endpoint (GET /products) uses lighter field names ──
  item_name?: string;
  item_name_kh?: string | null;
  item_price?: string;
  category_name?: string | null;
  slug: string;
  product_type: string | null;
  gender: string | null;
  stock_type: string;
  image: string;
  is_active_mobile: boolean;
  is_active_web: boolean;
  created_at: string;
  updated_at: string;
  category: Category | null;
  brand: Brand | null;
  color: Color | null;
  frame_shape: FrameShape | null;
  materials?: Material[];
  assets: Asset[];
  measurements?: Measurements | null;
  variations?: ProductVariation[];
  tags?: unknown[] | null;
  total_sold?: number | null;
  empty?: boolean;
}

/** What the app works with after `productController` unwraps the envelope. */
export interface ProductDetail {
  product: Product;
  related: Product[];
  telegram_inquiry_link: string;
}

/**
 * Raw GET /products/{id} envelope.
 *
 * The API nests the payload one level deeper than it used to:
 *   now:    { status, data: { product, related, telegram_inquiry_link } }
 *   before: { data: Product, related, telegram_inquiry_link }
 *
 * Reading the old shape against the new one silently yields a "product" with no
 * `image` and no `assets`, which is why the detail screen rendered no photo
 * rather than failing outright. Both shapes are accepted so a rollback on the
 * server does not break the app again.
 */
export interface ProductResponse {
  status?: string;
  data: ProductDetail | Product;
  related?: Product[];
  telegram_inquiry_link?: string;
}

export type ProductListFilters = {
  page?: number;
  category?: string | number;
  brand_1?: string | number;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  orderBy?: 'asc' | 'desc';
  is_active_mobile?: boolean;
  is_active_web?: boolean;
  limit?: number;
  brand?: string;
};


export type ProductListResponse = {
  data: Product[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    path: string;
    per_page: string;
    to: number | null;
    total: number;
    links: {
      url: string | null;
      label: string;
      active: boolean;
    }[];
  };
};