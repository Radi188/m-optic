import api from '../services/api';
import {
  Product,
  ProductDetail,
  ProductListFilters,
  ProductListResponse,
  ProductResponse,
} from '../types/glasses';

export const productController = {
  // Normalises the envelope here so every caller sees one shape. See
  // ProductResponse for the two layouts this has to cope with.
  async getProductDetail(id: number | string): Promise<ProductDetail> {
    const response = await api.get<ProductResponse>(`/products/${id}`);
    const body = response.data;
    const inner = body?.data as ProductDetail | Product | undefined;

    if (inner && 'product' in inner) {
      return {
        product: inner.product,
        related: inner.related ?? [],
        telegram_inquiry_link: inner.telegram_inquiry_link ?? '',
      };
    }

    return {
      product: inner as Product,
      related: body?.related ?? [],
      telegram_inquiry_link: body?.telegram_inquiry_link ?? '',
    };
  },

  async getProducts(filters: ProductListFilters = {}): Promise<ProductListResponse> {
    const params: Record<string, any> = {};

    if (filters.page !== undefined) params.page = filters.page;
    if (filters.category !== undefined) params.category = filters.category;
    if (filters.brand !== undefined) params.brand = filters.brand;
    if (filters.search) params.search = filters.search;
    if (filters.minPrice !== undefined) params.min_price = filters.minPrice;
    if (filters.maxPrice !== undefined) params.max_price = filters.maxPrice;
    if (filters.sortBy) params.sort_by = filters.sortBy;
    if (filters.orderBy) params.order_by = filters.orderBy;
    if (filters.is_active_mobile !== undefined) params.is_active_mobile = filters.is_active_mobile;
    if (filters.is_active_web !== undefined) params.is_active_web = filters.is_active_web;

    const response = await api.get<ProductListResponse>('/products', { params });
    return response.data;
  },
};