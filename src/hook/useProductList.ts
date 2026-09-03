import { useCallback, useEffect, useRef, useState } from 'react';
import { productController } from '../controller/productDetailController';
import { filterController } from '../controller/filterController';
import { ProductListFilters, ProductListResponse } from '../types/glasses';
import { BrandResponse } from '../types/brand';
import { FrameShapeItem } from '../types/frame';

type UseProductListReturn = {
  products: ProductListResponse['data'];
  brands: BrandResponse[];
  frameShapes: FrameShapeItem[];
  meta: ProductListResponse['meta'] | null;
  links: ProductListResponse['links'] | null;
  loading: boolean;
  isRefreshing: boolean;
  frameLoading: boolean;
  brandLoading: boolean;
  error: string | null;
  brandError: string | null;
  frameError: string | null;
  filters: ProductListFilters;
  setFilters: React.Dispatch<React.SetStateAction<ProductListFilters>>;
  refetch: () => Promise<void>;
  refresh: () => Promise<void>;
  refetchBrands: () => Promise<void>;
  refetchFrames: () => Promise<void>;
};

export const useProductList = (
  initialFilters: ProductListFilters = {},
): UseProductListReturn => {
  const [products, setProducts] = useState<ProductListResponse['data']>([]);
  const [brands, setBrands] = useState<BrandResponse[]>([]);
  const [frameShapes, setFrameShapes] = useState<FrameShapeItem[]>([]);

  const [meta, setMeta] = useState<ProductListResponse['meta'] | null>(null);
  const [links, setLinks] = useState<ProductListResponse['links'] | null>(null);

  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [brandLoading, setBrandLoading] = useState(false);
  const [frameLoading, setFrameLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [frameError, setFrameError] = useState<string | null>(null);

  const [filters, setFilters] = useState<ProductListFilters>({
    page: 1,
    limit: 10,
    ...initialFilters,
  });

  // Set for the one fetch a pull-to-refresh triggers, so the list stays on
  // screen under the spinner instead of being replaced by the skeleton. A ref
  // rather than state: the flag has to survive the re-render that changing the
  // page filter causes, without queuing a fetch of its own.
  const skipLoaderRef = useRef(false);

  const fetchProducts = useCallback(async () => {
    const showLoader = !skipLoaderRef.current;
    skipLoaderRef.current = false;

    try {
      if (showLoader) setLoading(true);
      setError(null);

      const response = await productController.getProducts(filters);

      const currentPage = Number(filters.page || 1);

      setProducts(prev =>
        currentPage > 1
          ? [...prev, ...response.data]
          : response.data,
      );

      setMeta(response.meta);
      setLinks(response.links);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to fetch products',
      );
    } finally {
      if (showLoader) setLoading(false);
      setIsRefreshing(false);
    }
  }, [filters]);

  /**
   * Pull-to-refresh. Always returns to page 1 — refetching whichever page the
   * infinite scroll happens to be on would append a duplicate page instead of
   * refreshing the list.
   */
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    skipLoaderRef.current = true;

    if (Number(filters.page ?? 1) !== 1) {
      // Changing the filter re-runs the fetch effect; the ref keeps it silent.
      setFilters(prev => ({ ...prev, page: 1 }));
      return;
    }
    await fetchProducts();
  }, [fetchProducts, filters.page]);

  const fetchBrands = useCallback(async () => {
    try {
      setBrandLoading(true);
      setBrandError(null);

      const response = await filterController.getBrands();
      setBrands(response);
    } catch (err: any) {
      setBrandError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to fetch brands',
      );
    } finally {
      setBrandLoading(false);
    }
  }, []);

  const fetchFramesShape = useCallback(async () => {
    try {
      setFrameLoading(true);
      setFrameError(null);

      const response = await filterController.getShapes();
      setFrameShapes(response);
    } catch (err: any) {
      setFrameError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to fetch frame shapes',
      );
    } finally {
      setFrameLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchFramesShape();
  }, [fetchFramesShape]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  return {
    products,
    brands,
    frameShapes,
    meta,
    links,
    loading,
    isRefreshing,
    frameLoading,
    brandLoading,
    error,
    brandError,
    frameError,
    filters,
    setFilters,
    refetch: fetchProducts,
    refresh,
    refetchBrands: fetchBrands,
    refetchFrames: fetchFramesShape
  };
};