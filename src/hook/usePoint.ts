import { useCallback, useEffect, useState } from 'react';
import { pointController } from '../controller/PointController';
import { PointResponse, TransactionPaginationResponse } from '../types/point';

type UsePointsScreenReturn = {
  pointsData: PointResponse | null;
  transactions: TransactionPaginationResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export const usePoints = (): UsePointsScreenReturn => {
  const [pointsData, setPointsData] = useState<PointResponse | null>(null);
  const [transactions, setTransactions] = useState<TransactionPaginationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const [points, txs] = await Promise.all([
        pointController.getPoint(),
        pointController.getPointTransaction(),
      ]);

      setPointsData(points);
      setTransactions(txs);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load points or transactions'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    pointsData,
    transactions,
    isLoading,
    isRefreshing,
    error,
    refetch,
  };
};