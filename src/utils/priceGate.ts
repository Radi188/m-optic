/**
 * Price visibility: prices are shown to signed-in users only. Signed-out
 * visitors see "Log in to see price" (components/ui/LockedPrice) wherever a
 * price would be.
 *
 * NOTE: this is presentation only. The product endpoints still return every
 * price, so a hidden price is present on the device — it is a reason to sign
 * in, not an access control. Prices that genuinely must not reach signed-out
 * clients have to be withheld by the API.
 */

import { useAppSelector } from '../store';
import { selectIsAuthenticated } from '../store/slices/authSlice';

/** Whether prices may be shown right now (i.e. someone is signed in). */
export const usePriceVisible = (): boolean => useAppSelector(selectIsAuthenticated);
