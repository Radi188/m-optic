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

export interface Asset {
  id: number;
  url: string;
  type: string | null;
}

export interface Product {
  id: number;
  item_code: string;
  name: string;
  description: string | null;
  price: number;
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
  empty?: boolean;
}

export interface ProductResponse {
  data: Product;
  related: Product[];
  telegram_inquiry_link: string;
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
  limit?: number
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