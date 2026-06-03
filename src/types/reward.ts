export type RewardsResponse = {
  available_points: number;
  rewards: RewardItem[];
  redeem_history: RedeemHistoryItem[];
};

export type RewardItem = {
  id: number;
  title: string;
  description?: string | null;
  points_required: number;
  image_url?: string | null;
  available: boolean;
  tag?: string;
};

export type RedeemHistoryItem = {
  id: number;
  reward_id: number;
  title: string;
  points_used: number;
  redeemed_at: string;
};