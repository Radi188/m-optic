import api from '../services/api';
import { ProductListFilters, ProductListResponse, ProductResponse } from '../types/glasses';

export const productController = {
  async getProductDetail(id: number | string): Promise<ProductResponse> {
    const response = await api.get<ProductResponse>(`/products/${id}`);
    return response.data;
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