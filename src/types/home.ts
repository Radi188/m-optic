import { BrandResponse } from "./brand";
import { Product } from "./glasses";

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
  image_url: string | null;
  link_url: string | null;
  sort_order: number;
}


export interface ProductCategory {
  [key: string]: unknown;
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

export interface ProductMaterials {
  [key: string]: unknown;
}

export interface ProductAsset {
  id: number;
  url: string;
  type: string | null;
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