/**
 * Money formatting for every price in the app: 1100 → "$1,100".
 *
 * Grouping is done by hand rather than with toLocaleString so the result is
 * the same in every app language (Khmer would otherwise swap in Khmer digits
 * and a different separator) and on engines without full Intl.
 */

type Amount = number | string | null | undefined;

/** "1100" → "1,100"; works on the integer part only. */
const groupThousands = (digits: string): string =>
  digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/**
 * 1100 → "1,100", 1100.5 → "1,100.50", 1100 with `decimals: 2` → "1,100.00".
 *
 * Without `decimals`, whole amounts show no cents (frame prices) and anything
 * else shows two. Pass `decimals: 2` where cents always show (invoices).
 * Values that are not numbers come back as given, so a bad payload is visible
 * rather than rendered as "NaN".
 */
export const formatAmount = (
  value: Amount,
  options: { decimals?: number } = {},
): string => {
  if (value === null || value === undefined || value === '') return '';

  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n)) return String(value);

  const decimals = options.decimals ?? (Number.isInteger(n) ? 0 : 2);
  const [whole, fraction] = Math.abs(n).toFixed(decimals).split('.');
  const sign = n < 0 ? '-' : '';

  return `${sign}${groupThousands(whole)}${fraction ? `.${fraction}` : ''}`;
};

/** formatAmount with the currency in front: 1100 → "$1,100". */
export const formatPrice = (
  value: Amount,
  options: { currency?: string; decimals?: number } = {},
): string => {
  const amount = formatAmount(value, options);
  if (!amount) return '';
  const currency = options.currency ?? '$';
  // A refund reads "-$5", not "$-5".
  return amount.startsWith('-')
    ? `-${currency}${amount.slice(1)}`
    : `${currency}${amount}`;
};
