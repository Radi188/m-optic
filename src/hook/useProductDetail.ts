import { useCallback, useEffect, useState } from 'react';
import { productController } from '../controller/productDetailController';
import { Product, ProductDetail } from '../types/glasses';

interface UseProductDetailReturn {
  product: Product | null;
  related: Product[];
  inquiryLink: string;
  raw: ProductDetail | null;
  loading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useProductDetail = (
  id?: number | string,
): UseProductDetailReturn => {
  const [raw, setRaw] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `showLoader` off keeps the current detail on screen under the refresh
  // spinner instead of flashing the skeleton back in.
  const fetchProductDetail = useCallback(
    async (showLoader = true) => {
      if (id === undefined || id === null || id === '') {
        setRaw(null);
        setError(null);
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      try {
        if (showLoader) setLoading(true);
        setError(null);
        const result = await productController.getProductDetail(id);
        setRaw(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        if (showLoader) setLoading(false);
        setIsRefreshing(false);
      }
    },
    [id],
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchProductDetail(false);
  }, [fetchProductDetail]);

  useEffect(() => {
    fetchProductDetail(true);
  }, [fetchProductDetail]);

  return {
    product: raw?.product ?? null,
    related: raw?.related ?? [],
    inquiryLink: raw?.telegram_inquiry_link ?? '',
    raw,
    loading,
    isRefreshing,
    error,
    refetch: fetchProductDetail,
    refresh,
  };
};