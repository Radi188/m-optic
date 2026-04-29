import api from './api';
import type { GlassItem } from '../types/navigation';

export interface ApiGlassItem {
  id: string | number;
  name: string;
  brand: string;
  price: number;
  stock: number | string;
  status?: string;
  image?: string;
  frame_shape?: string;
  frameShape?: string;
  description?: string;
}

// Normalise API shape → app GlassItem shape
const normalise = (item: ApiGlassItem): GlassItem => {
  const stock = Number(item.stock ?? 0);
  return {
    id: String(item.id),
    name: item.name,
    brand: item.brand,
    price: Number(item.price),
    stock,
    status: item.status ?? (stock === 0 ? 'Out of Stock' : stock <= 3 ? 'Low Stock' : 'In Stock'),
    image: item.image ?? '',
    frameShape: (item.frame_shape ?? item.frameShape ?? 'rectangle') as GlassItem['frameShape'],
    description: item.description,
  };
};

export const glassService = {
  async fetchAll(): Promise<GlassItem[]> {
    const { data } = await api.get<ApiGlassItem[] | { data: ApiGlassItem[] }>('/products');
    const list = Array.isArray(data) ? data : data.data;
    return list.map(normalise);
  },

  async fetchOne(id: string): Promise<GlassItem> {
    const { data } = await api.get<ApiGlassItem>(`/products/${id}`);
    return normalise(data);
  },

  async create(payload: Partial<ApiGlassItem>): Promise<GlassItem> {
    const { data } = await api.post<ApiGlassItem>('/products', payload);
    return normalise(data);
  },

  async update(id: string, payload: Partial<ApiGlassItem>): Promise<GlassItem> {
    const { data } = await api.put<ApiGlassItem>(`/products/${id}`, payload);
    return normalise(data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/products/${id}`);
  },
};
