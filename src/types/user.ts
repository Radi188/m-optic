export type CustomerProfileResponse = {
  id: number;
  customer_name: string;
  phone_number: string;
  email: string | null;
  /** Shop-created customers come back capitalised ("Male"); see PUT note. */
  gender: 'Male' | 'Female' | 'Other' | string | null;
  age: number | null;
  avatar_url: string | null;
  /** Sent as 1 / 0. */
  is_member: boolean | number;
  order_count: number;
  loyalty_points: number;
  loyalty_total_points: number;
  tier: CustomerTier | null;
  next_tier: CustomerNextTier | null;
  points_to_next_tier: number;
  progress_percentage: number;
  prescription: CustomerPrescription | null;
};

/**
 * PUT /profile → 200. `customer` is the raw record: no avatar_url, tier or
 * loyalty summary, so the screen refetches GET /profile instead of using it.
 */
export type UpdateProfileResponse = {
  message: string;
  customer: Partial<CustomerProfileResponse>;
};

/** POST /profile/avatar → 200. The URL changes on every upload. */
export type UploadAvatarResponse = {
  message: string;
  avatar_url: string;
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
