import { describe, it, expect } from 'vitest';
import { parseInventoryNumericField } from '@/features/inventory/utils/parseInventoryNumericField';

describe('parseInventoryNumericField', () => {
  describe('low_stock_threshold', () => {
    it('accepts non-negative integers', () => {
      expect(parseInventoryNumericField('low_stock_threshold', '0')).toEqual({
        ok: true,
        formData: { low_stock_threshold: 0 },
      });
      expect(parseInventoryNumericField('low_stock_threshold', ' 25 ')).toEqual({
        ok: true,
        formData: { low_stock_threshold: 25 },
      });
    });

    it('rejects empty, negative, decimal, and non-numeric input', () => {
      for (const input of ['', '-1', '2.5', 'abc']) {
        const result = parseInventoryNumericField('low_stock_threshold', input);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toMatch(/whole number/i);
        }
      }
    });
  });

  describe('default_unit_cost', () => {
    it('accepts non-negative numbers and rounds to cents', () => {
      expect(parseInventoryNumericField('default_unit_cost', '12.999')).toEqual({
        ok: true,
        formData: { default_unit_cost: 13 },
      });
      expect(parseInventoryNumericField('default_unit_cost', '4.567')).toEqual({
        ok: true,
        formData: { default_unit_cost: 4.57 },
      });
      expect(parseInventoryNumericField('default_unit_cost', '0')).toEqual({
        ok: true,
        formData: { default_unit_cost: 0 },
      });
    });

    it('clears the cost when input is empty', () => {
      expect(parseInventoryNumericField('default_unit_cost', '  ')).toEqual({
        ok: true,
        formData: { default_unit_cost: null },
      });
    });

    it('rejects negative and non-numeric input', () => {
      for (const input of ['-5', 'free']) {
        const result = parseInventoryNumericField('default_unit_cost', input);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toMatch(/number of 0 or more/i);
        }
      }
    });
  });
});
