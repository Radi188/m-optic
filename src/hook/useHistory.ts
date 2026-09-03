// hooks/useHistory.ts
import { useCallback, useEffect, useState } from 'react';

import { historyController } from '../controller/historyController';
import type { History } from '../types/history';

type UseHistoryReturn = {
  history: History | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const EMPTY: History = { refractions: [], invoices: [] };

export const useHistory = (enabled = true): UseHistoryReturn => {
  const [history, setHistory] = useState<History | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setIsLoading(true);
      setError(null);

      const data = await historyController.getHistory();
      setHistory(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load history');
    } finally {
      if (showLoader) setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    setIsRefreshing(true);
    await fetchHistory(false);
  }, [fetchHistory]);

  useEffect(() => {
    if (!enabled) {
      // Signed out: nothing to fetch, and no spinner to leave hanging.
      setHistory(EMPTY);
      setIsLoading(false);
      return;
    }
    fetchHistory(true);
  }, [enabled, fetchHistory]);

  return { history, isLoading, isRefreshing, error, refetch };
};
