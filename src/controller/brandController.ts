import api from '../services/api';
  import { BrandListResponse, BrandResponse } from '../types/brand';



export const brandController = {
  async getBrands(): Promise<BrandResponse[]> {
    const response = await api.get<BrandListResponse>('/filters?include=brands');
    return response.data.data.brands ?? [];
  },
};