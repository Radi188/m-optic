import api from '../services/api';
import { PointResponse, TransactionPaginationResponse } from '../types/point';

export const pointController = {
  async getPoint(): Promise<PointResponse> {
    const response = await api.get<PointResponse>('/profile/points');

    if (__DEV__) {
      console.log('[points] raw:', JSON.stringify(response.data, null, 2));
      console.log('[points] summary:', {
        loyalty_points: response.data?.loyalty_points,
        loyalty_total_points: response.data?.loyalty_total_points,
        tier: response.data?.tier?.name,
        tier_id: response.data?.tier?.id,
        tier_min_points: response.data?.tier?.min_points,
        next_tier: response.data?.next_tier?.name,
        next_tier_min_points: response.data?.next_tier?.min_points,
        points_to_next_tier: response.data?.points_to_next_tier,
        progress_percentage: response.data?.progress_percentage,
        recent_transactions: response.data?.recent_transactions?.length ?? 0,
      });
      // The tier rail renders one node per entry, and matches the active one
      // by id — so both the order and the ids matter.
      console.log(
        '[points] all_tiers:',
        (response.data?.all_tiers ?? []).map(tier => ({
          id: tier?.id,
          name: tier?.name,
          min_points: tier?.min_points,
          discount: tier?.discount_percentage,
          benefits: tier?.benefits?.length ?? 0,
        })),
      );
    }

    return response.data;
  },

  async getPointTransaction(): Promise<TransactionPaginationResponse> {
    const response = await api.get<TransactionPaginationResponse>(
      '/profile/transactions',
    );

    if (__DEV__) {
      console.log('[transactions] page:', {
        current_page: response.data?.current_page,
        last_page: response.data?.last_page,
        per_page: response.data?.per_page,
        total: response.data?.total,
        rows: response.data?.data?.length ?? 0,
        next_page_url: response.data?.next_page_url,
      });
      console.log(
        '[transactions] rows:',
        JSON.stringify(response.data?.data ?? [], null, 2),
      );
    }

    return response.data;
  },
};
