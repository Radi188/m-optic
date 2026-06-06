import { useState, useEffect, useCallback } from 'react';
import { RewardsResponse } from '../types/reward';
import { rewardController } from '../controller/rewardController';

type UseRewardReturn = {
  rewardsData: RewardsResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export const useReward = (): UseRewardReturn => {
  const [rewardsData, setRewardsData] = useState<RewardsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRewards = useCallback(async () => {
    try {
      setError(null);
      const data = await rewardController.getRewards();
      setRewardsData(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to load rewards'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    setIsRefreshing(true);
    await fetchRewards();
  }, [fetchRewards]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  return {
    rewardsData,
    isLoading,
    isRefreshing,
    error,
    refetch,
  };
};