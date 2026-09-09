import api from '../services/api';
import { RedeemRewardResponse, RewardsResponse } from '../types/reward';

export const rewardController = {
  /** Fetch rewards summary for the logged-in user */
  async getRewards(): Promise<RewardsResponse> {
    const response = await api.get<RewardsResponse>('/rewards');

    if (__DEV__) {
      console.log('[rewards] raw:', JSON.stringify(response.data, null, 2));
      console.log('[rewards] summary:', {
        available_points: response.data?.available_points,
        rewards: response.data?.rewards?.length ?? 0,
        redeem_history: response.data?.redeem_history?.length ?? 0,
        keys: Object.keys(response.data ?? {}),
      });
      // Each card's redeem button is gated on `points_required` and
      // `available`, so those two fields decide what the screen shows.
      console.log(
        '[rewards] items:',
        (response.data?.rewards ?? []).map(item => ({
          id: item?.id,
          title: item?.title,
          points_required: item?.points_required,
          available: item?.available,
          tag: item?.tag,
          image_url: item?.image_url,
        })),
      );
      console.log(
        '[rewards] history:',
        JSON.stringify(response.data?.redeem_history ?? [], null, 2),
      );
    }

    return response.data;
  },

  /**
   * Spend points on a reward.
   *
   * The server owns the balance check, so a rejection here (insufficient
   * points, reward withdrawn, already redeemed) arrives as a non-2xx with a
   * message worth showing the customer verbatim.
   */
  async redeemReward(rewardId: number | string): Promise<RedeemRewardResponse> {
    const response = await api.post<RedeemRewardResponse>(
      `/rewards/${rewardId}/redeem`,
    );
    return response.data;
  },
};
