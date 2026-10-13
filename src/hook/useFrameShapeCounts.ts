import { useEffect, useState } from 'react';
import { productController } from '../controller/productDetailController';

/**
 * How many app-listed frames each named shape has, keyed by the name passed
 * in. A shape is missing from the result while loading or if its count could
 * not be fetched, so callers should treat "missing" as unknown, not as zero.
 */
export function useFrameShapeCounts(names: string[], enabled = true) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  // A stable dependency for the effect; callers usually pass a fresh array.
  const key = names.join('|');

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const unique = [...new Set(key.split('|').filter(Boolean))];

    Promise.all(
      unique.map(async name => {
        try {
          // One item per page: only meta.total is needed.
          const res = await productController.getProducts({
            frame_shape: name,
            is_active_mobile: true,
            page: 1,
            limit: 1,
          });
          return [name, res.meta?.total ?? res.data.length] as const;
        } catch {
          return null;
        }
      }),
    ).then(entries => {
      if (cancelled) return;
      const next: Record<string, number> = {};
      for (const entry of entries) {
        if (entry) next[entry[0]] = entry[1];
      }
      setCounts(next);
    });

    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  return counts;
}
