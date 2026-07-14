import api from '../services/api';
  import { BrandListResponse, BrandResponse } from '../types/brand';
import { FrameShapeItem, FrameShapesResponse } from '../types/frame';



export const filterController = {
  async getBrands(): Promise<BrandResponse[]> {
    const response = await api.get<BrandListResponse>('/filters?include=brands');
    return response.data.data.brands ?? [];
  },
  async getShapes(): Promise<FrameShapeItem[]> {
     const response = await api.get<FrameShapesResponse>('/filters?include=frame_shapes');
    return response.data.data.frame_shapes ?? [];
  }
};