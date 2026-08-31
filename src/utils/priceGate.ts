/**
 * Price visibility for signed-out browsers.
 *
 * Signed-out visitors see the price on the first few frames and a blurred
 * placeholder on the rest, so the catalogue still reads as a real shop rather
 * than a paywall while giving a reason to sign in.
 *
 * NOTE: this is presentation only. The list endpoint returns every price, so a
 * blurred price is still present on the device — it is a nudge to sign in, not
 * an access control. Prices that genuinely must not reach signed-out clients
 * have to be withheld by the API.
 */

/** How many frames show their price before the blur starts. */
export const FREE_PRICE_PREVIEW = 2;

/**
 * Whether the price for the item at `index` should be readable.
 * Signed-in users always see every price.
 */
export const isPriceVisible = (
  isAuthenticated: boolean,
  index: number,
): boolean => isAuthenticated || index < FREE_PRICE_PREVIEW;
