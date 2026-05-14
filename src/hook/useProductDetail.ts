import { useCallback, useEffect, useState } from 'react';
import { productController } from '../controller/productDetailController';
import { Product, ProductResponse } from '../types/glasses';

interface UseProductDetailReturn {
  product: Product | null;
  related: Product[];
  inquiryLink: string;
  raw: ProductResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useProductDetail = (
  id?: number | string,
): UseProductDetailReturn => {
  const [raw, setRaw] = useState<ProductResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProductDetail = useCallback(async () => {
    if (id === undefined || id === null || id === '') {
      setRaw(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await productController.getProductDetail(id);
      setRaw(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProductDetail();
  }, [fetchProductDetail]);

  return {
    product: raw?.data ?? null,
    related: raw?.related ?? [],
    inquiryLink: raw?.telegram_inquiry_link ?? '',
    raw,
    loading,
    error,
    refetch: fetchProductDetail,
  };
};