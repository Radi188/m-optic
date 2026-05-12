export interface BrandResponse {
  id: number;
  name: string | null;
  logo: string | null;
  slug?: string;
}

export interface BrandListResponse {
  status: string;
  data: {
    brands: BrandResponse[];
  };
}