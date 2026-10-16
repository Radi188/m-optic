import { formatAmount, formatPrice } from '../src/utils/formatPrice';

describe('formatPrice', () => {
  it('adds thousands separators', () => {
    expect(formatPrice(1100)).toBe('$1,100');
    expect(formatPrice(88)).toBe('$88');
    expect(formatPrice(1234567)).toBe('$1,234,567');
    expect(formatPrice(999)).toBe('$999');
    expect(formatPrice(1000)).toBe('$1,000');
  });

  it('shows cents only when there are some, unless told to', () => {
    expect(formatPrice(1100.5)).toBe('$1,100.50');
    expect(formatPrice(1100, { decimals: 2 })).toBe('$1,100.00');
    expect(formatPrice(12.5, { decimals: 2 })).toBe('$12.50');
  });

  it('accepts API strings', () => {
    expect(formatPrice('1100')).toBe('$1,100');
    expect(formatPrice('1100.00')).toBe('$1,100');
    expect(formatPrice('2500.75')).toBe('$2,500.75');
  });

  it('uses the given currency and puts a minus in front of it', () => {
    expect(formatPrice(1100, { currency: '៛' })).toBe('៛1,100');
    expect(formatPrice(-1100)).toBe('-$1,100');
  });

  it('returns empty for missing values and the raw text for junk', () => {
    expect(formatPrice(null)).toBe('');
    expect(formatPrice(undefined)).toBe('');
    expect(formatPrice('')).toBe('');
    expect(formatAmount('N/A')).toBe('N/A');
  });
});
