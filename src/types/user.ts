export type CustomerProfileResponse = {
  id: number;
  customer_name: string;
  phone_number: string;
  email: string | null;
  gender: 'Male' | 'Female' | 'Other' | string;
  age: number | null;
  avatar_url: string | null;
  is_member: boolean;
  order_count: number;
  loyalty_points: number;
  loyalty_total_points: number;
  tier: CustomerTier | null;
  next_tier: CustomerNextTier | null;
  points_to_next_tier: number;
  progress_percentage: number;
  prescription: CustomerPrescription | null;
};

export type CustomerTier = {
  id: number;
  name: string;
  min_points: number;
  discount_percentage: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  benefits: TierBenefit[];
};

export type CustomerNextTier = {
  id: number;
  name: string;
  min_points: number;
  discount_percentage: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type TierBenefit = {
  id?: number;
  title?: string;
  name?: string;
  description?: string | null;
  icon?: string | null;
};

export type CustomerPrescription = {
  right_eye: string;
  left_eye: string;
  add: string;
  pd: string;
  created_at: string;
};