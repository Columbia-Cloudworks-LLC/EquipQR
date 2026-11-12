import { describe, it, expect } from 'vitest';
import { formatCurrency } from './currencyUtils';

describe('currencyUtils', () => {
  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(12345)).toBe('$123.45'); // cents to dollars
      expect(formatCurrency(100000)).toBe('$1,000.00');
      expect(formatCurrency(99)).toBe('$0.99');
    });

    it('should handle zero amounts', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle negative amounts', () => {
      expect(formatCurrency(-12345)).toBe('-$123.45');
    });
  });
});