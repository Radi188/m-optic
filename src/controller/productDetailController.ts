import api from '../services/api';
import {
  Product,
  ProductDetail,
  ProductListFilters,
  ProductListResponse,
  ProductResponse,
} from '../types/glasses';
import { FrameShapeItem } from '../types/frame';
import { filterController } from './filterController';

/** Letters only, so "Cat-Eye", "cat eye" and "CAT_EYE" compare equal. */
export const canonicalShapeName = (name: string) =>
  name.toLowerCase().replace(/[^a-z]/g, '');

// The catalogue's frame shapes rarely change, so fetch them once per session.
// A failed fetch is not cached, so the next call retries.
let shapesRequest: Promise<FrameShapeItem[]> | null = null;

const loadFrameShapes = () => {
  shapesRequest ??= filterController.getShapes().catch(err => {
    shapesRequest = null;
    throw err;
  });
  return shapesRequest;
};

export async function resolveFrameShapeId(name: string): Promise<number | null> {
  const wanted = canonicalShapeName(name);
  const shapes = await loadFrameShapes();
  return shapes.find(s => canonicalShapeName(s.name) === wanted)?.id ?? null;
}

const emptyProductList = (filters: ProductListFilters): ProductListResponse => ({
  data: [],
  links: { first: null, last: null, prev: null, next: null },
  meta: {
    current_page: Number(filters.page ?? 1),
    from: null,
    last_page: 1,
    path: '',
    per_page: String(filters.limit ?? ''),
    to: null,
    total: 0,
    links: [],
  },
});

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
    if (filters.limit !== undefined) params.per_page = filters.limit;
    if (filters.category !== undefined) params.category = filters.category;
    if (filters.brand_1 !== undefined) params.brand_id = filters.brand_1;
    if (filters.search) params.search = filters.search;
    if (filters.min_price !== undefined) params.min_price = filters.min_price;
    if (filters.max_price !== undefined) params.max_price = filters.max_price;
    if (filters.sortBy) params.sort_by = filters.sortBy;
    if (filters.orderBy) params.order_by = filters.orderBy;
    if (filters.is_active_mobile !== undefined) params.is_active_mobile = filters.is_active_mobile;
    if (filters.is_active_web !== undefined) params.is_active_web = filters.is_active_web;

    // The API filters shapes by id only; screens and the face-scan results
    // work with names.
    if (filters.frame_shape_id !== undefined) {
      params.frame_shape_id = filters.frame_shape_id;
    } else if (filters.frame_shape) {
      const shapeId = await resolveFrameShapeId(filters.frame_shape);
      // An unknown shape matches nothing. Dropping the filter instead would
      // show the whole catalogue under that shape's name.
      if (shapeId === null) return emptyProductList(filters);
      params.frame_shape_id = shapeId;
    }

    const response = await api.get<ProductListResponse>('/products', { params });
    return response.data;
  },
};
