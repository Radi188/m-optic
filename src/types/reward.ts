/**
 * GET /rewards — the loyalty catalogue and the customer's own redemptions.
 *
 * Field names follow the real payload: a reward carries `name`/`image`, and
 * the server decides redeemability itself via `can_redeem` / `points_needed`
 * rather than leaving the client to compare balances. The older spellings are
 * kept as optional aliases so a shape change degrades instead of blanking the
 * screen.
 */
import { buildFileUrl } from '../utils/fileUrlHelper';

export type RewardsResponse = {
  available_points: number;
  rewards: RewardItem[];
  redeem_history: RedeemHistoryItem[];
};

export type RewardItem = {
  id: number;
  name?: string | null;
  description?: string | null;
  points_required: number;
  /** Optional ribbon, e.g. "Popular", with its own colour. */
  badge?: string | null;
  badge_color?: string | null;
  image?: string | null;
  /** Server-side verdict — the button is gated on this. */
  can_redeem?: boolean | null;
  /** How many more points this reward needs. 0 once affordable. */
  points_needed?: number | null;

  /** Older spellings. */
  title?: string | null;
  image_url?: string | null;
  available?: boolean | null;
  tag?: string | null;
};

export type RedeemHistoryItem = {
  id: number;
  /** The catalogue row this redemption points at. */
  loyalty_reward_id?: number | null;
  reward_id?: number | null;
  /** The reward as it was redeemed, nested on the history row. */
  reward?: {
    id?: number | null;
    name?: string | null;
    image?: string | null;
  } | null;
  name?: string | null;
  title?: string | null;
  points_used?: number | null;
  points?: number | null;
  redeemed_at?: string | null;
  created_at?: string | null;
  image?: string | null;

  /**
   * Collection state — confirmed as free-text `status` ("pending" until the
   * customer picks the item up in store). The boolean and timestamp forms
   * below are kept as tolerated alternatives.
   */
  status?: string | null;
  is_collected?: boolean | null;
  collected_at?: string | null;
  /** Pickup code, if the shop issues one. */
  code?: string | null;
  redeem_code?: string | null;
};

/** What the history row resolves to after reading whichever field arrived. */
export type RedeemStatus = 'collected' | 'pending' | 'cancelled';

/**
 * Reward artwork arrives inconsistently: the catalogue sends an absolute URL,
 * while a history row's nested `reward.image` is a bare storage path.
 */
export function rewardImageUrl(value?: string | null): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return buildFileUrl(value);
}

export function redeemStatusOf(item: RedeemHistoryItem): RedeemStatus {
  if (item.collected_at) return 'collected';
  if (item.is_collected === true) return 'collected';

  const status = (item.status ?? '').toLowerCase().trim();
  if (!status) {
    // No status field at all: a redemption exists but the shop has not
    // recorded a handover, so it is still awaiting collection.
    return item.is_collected === false ? 'pending' : 'pending';
  }

  if (/collect|complete|done|used|claimed|delivered/.test(status)) {
    return 'collected';
  }
  if (/cancel|expire|reject|void/.test(status)) return 'cancelled';
  return 'pending';
}

/** POST /rewards/{id}/redeem. Fields are optional — only `message` is shown. */
export type RedeemRewardResponse = {
  message?: string | null;
  /** Balance after the redemption, when the server returns it. */
  available_points?: number | null;
  redeem?: RedeemHistoryItem | null;
};
