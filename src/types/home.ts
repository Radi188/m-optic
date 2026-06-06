export interface HomeResponse {
  status: string;
  data: HomeData;
}

export interface HomeData {
  banners: BannerItem[];
  new_arrivals: Product[];
  brands: BrandResponse[];
  frame_shapes: FrameShapeItem[];
  announcements: AnnouncementItem[];
}

export interface BannerItem {
  id: number;
  title: string;
  description: string | null;
  image_path: string;
  image_url: string;
  cta_text: string | null;
  cta_link: string | null;
  alt_text: string | null;
  platform: 'mobile' | 'web' | 'both';
  sort_order: number;
  is_active: 0 | 1;
  start_date: string | null;
  end_date: string | null;
  text_color: string | null;
  button_color: string | null;
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
  total_sold: number | null;
  created_at: string;
  updated_at: string;
  category: Record<string, unknown>;
  brand: ProductBrand | null;
  color: ProductColor | null;
  frame_shape: ProductFrameShape | null;
  materials: Record<string, unknown>;
  assets: ProductAsset[];
  tags: ProductTag[];
}

export interface ProductBrand {
  id: number;
  name: string;
}

export interface ProductColor {
  id: number;
  name: string | null;
  hex_code: string | null;
}

export interface ProductFrameShape {
  id: number;
  name: string;
}

export interface ProductAsset {
  id: number;
  url: string;
  type: string | null; // gallery or 3d_model
  format: string | null;
}

export interface ProductTag {
  id: number;
  name: string;
}

export interface BrandResponse {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  logo: string | null;
  seo: BrandSeo;
}

export interface BrandSeo {
  title: string | null;
  description: string | null;
  keywords: string | null;
}

export interface FrameShapeItem {
  id: number;
  name: string;
  icon_url: string | null;
}

export interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  banner_image: string | null;
  link_url: string | null;
  link_text: string | null;
  is_featured: boolean;
  created_at: string;
  scheduled_at: string | null;
}