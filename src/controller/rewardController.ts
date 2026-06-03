import api from '../services/api';
import { RewardsResponse } from '../types/reward';

export const rewardController = {
  /** Fetch rewards summary for the logged-in user */
  async getRewards(): Promise<RewardsResponse> {
    const response = await api.get<RewardsResponse>('/rewards');
    return response.data;
  },
};