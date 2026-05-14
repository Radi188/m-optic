import { useCallback, useEffect, useState } from 'react';
import { productController } from '../controller/productDetailController';
import { brandController } from '../controller/brandController';
import { ProductListFilters, ProductListResponse } from '../types/glasses';
import { BrandResponse } from '../types/brand';

type UseProductListReturn = {
  products: ProductListResponse['data'];
  brands: BrandResponse[];
  meta: ProductListResponse['meta'] | null;
  links: ProductListResponse['links'] | null;
  loading: boolean;
  brandLoading: boolean;
  error: string | null;
  brandError: string | null;
  filters: ProductListFilters;
  setFilters: React.Dispatch<React.SetStateAction<ProductListFilters>>;
  refetch: () => Promise<void>;
  refetchBrands: () => Promise<void>;
};

export const useProductList = (
  initialFilters: ProductListFilters = {}
): UseProductListReturn => {
  const [products, setProducts] = useState<ProductListResponse['data']>([]);
  const [brands, setBrands] = useState<BrandResponse[]>([]);
  const [meta, setMeta] = useState<ProductListResponse['meta'] | null>(null);
  const [links, setLinks] = useState<ProductListResponse['links'] | null>(null);

  const [loading, setLoading] = useState(false);
  const [brandLoading, setBrandLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [brandError, setBrandError] = useState<string | null>(null);

  const [filters, setFilters] = useState<ProductListFilters>(initialFilters);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await productController.getProducts(filters);

      setProducts(response.data);
      setMeta(response.meta);
      setLinks(response.links);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchBrands = useCallback(async () => {
    try {
      setBrandLoading(true);
      setBrandError(null);

      const response = await brandController.getBrands();
      setBrands(response);
    } catch (err: any) {
      setBrandError(err?.response?.data?.message || err?.message || 'Failed to fetch brands');
    } finally {
      setBrandLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  return {
    products,
    brands,
    meta,
    links,
    loading,
    brandLoading,
    error,
    brandError,
    filters,
    setFilters,
    refetch: fetchProducts,
    refetchBrands: fetchBrands,
  };
};