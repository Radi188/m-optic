export type PointResponse = {
  loyalty_points: number;
  loyalty_total_points: number;
  tier: LoyaltyTier | null;
  next_tier: LoyaltyTier | null;
  points_to_next_tier: number;
  progress_percentage: number;
  all_tiers: LoyaltyTier[];
  recent_transactions: LoyaltyTransaction[];
};

export type LoyaltyTier = {
  id: number;
  name: string;
  min_points: number;
  discount_percentage: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  benefits: LoyaltyBenefit[];
};

export type LoyaltyBenefit = {
  id?: number;
  title?: string;
  name?: string;
  description?: string | null;
  icon?: string | null;
};

export type LoyaltyTransaction = {
  id: number;
  type: 'earn' | 'redeem' | 'adjustment' | string;
  points: number;
  description: string | null;
  created_at: string;
};

export type TransactionPaginationResponse<T = any> = {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number | null;
  last_page: number;
  last_page_url: string;
  links: PaginationLink[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
};

export type PaginationLink = {
  url: string | null;
  label: string;
  active: boolean;
};

// Example transaction item type
export type TransactionItem = {
  id: number;
  type: 'earn' | 'redeem' | string;
  points: number;
  description?: string | null;
  created_at: string;
};