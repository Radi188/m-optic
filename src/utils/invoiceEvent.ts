import { Colors } from '../theme';

/**
 * The receipts carry three document events, and each means something different
 * to the customer: a Receipt is a completed sale, a Deposit leaves a balance
 * still to pay, and a Repay settles that balance.
 *
 * Anything else the API starts sending falls back to a neutral chip rather
 * than borrowing a colour whose meaning we would be inventing.
 */
export function eventColors(event: string | null): { bg: string; fg: string } {
  switch ((event ?? '').trim().toLowerCase()) {
    case 'receipt':
      return { bg: Colors.successLight, fg: Colors.success };
    case 'deposit':
      return { bg: Colors.warningLight, fg: Colors.warning };
    case 'repay':
      return { bg: Colors.infoLight, fg: Colors.info };
    default:
      return { bg: Colors.gray100, fg: Colors.gray600 };
  }
}
