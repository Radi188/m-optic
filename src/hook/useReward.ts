import { useState, useEffect, useCallback } from 'react';
import { RewardsResponse } from '../types/reward';
import { rewardController } from '../controller/rewardController';

type RedeemResult = { ok: boolean; message: string | null };

type UseRewardReturn = {
  rewardsData: RewardsResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Id currently being redeemed, so only that card shows a spinner. */
  redeemingId: number | null;
  redeem: (rewardId: number) => Promise<RedeemResult>;
};

export const useReward = (): UseRewardReturn => {
  const [rewardsData, setRewardsData] = useState<RewardsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<number | null>(null);

  const fetchRewards = useCallback(async () => {
    try {
      setError(null);
      const data = await rewardController.getRewards();
      setRewardsData(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || 'Failed to load rewards',
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

  /**
   * Redeem, then refetch.
   *
   * The list is reloaded rather than patched locally because a redemption
   * changes the balance, every reward's `can_redeem`/`points_needed`, and the
   * history — the server is the only thing that knows all of that.
   *
   * Failures are returned rather than thrown so the screen can show the
   * server's own message without a try/catch at the call site.
   */
  const redeem = useCallback(
    async (rewardId: number): Promise<RedeemResult> => {
      // Guard against a double tap landing two redemptions.
      if (redeemingId !== null) {
        return { ok: false, message: null };
      }

      try {
        setRedeemingId(rewardId);
        const result = await rewardController.redeemReward(rewardId);
        await fetchRewards();
        return { ok: true, message: result?.message ?? null };
      } catch (err: any) {
        return {
          ok: false,
          message:
            err?.response?.data?.message ||
            err?.message ||
            'Failed to redeem reward',
        };
      } finally {
        setRedeemingId(null);
      }
    },
    [fetchRewards, redeemingId],
  );

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  return {
    rewardsData,
    isLoading,
    isRefreshing,
    error,
    refetch,
    redeemingId,
    redeem,
  };
};
