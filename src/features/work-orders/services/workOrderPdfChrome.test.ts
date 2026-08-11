import { describe, expect, it } from 'vitest';
import { formatWorkOrderIdForPdf } from './workOrderPdfChrome';

describe('workOrderPdfChrome', () => {
  describe('formatWorkOrderIdForPdf', () => {
    it('returns short ids unchanged', () => {
      expect(formatWorkOrderIdForPdf('abcd1234')).toBe('abcd1234');
      expect(formatWorkOrderIdForPdf('short')).toBe('short');
    });

    it('truncates long ids to first4...last4', () => {
      expect(formatWorkOrderIdForPdf('660e8400-e29b-41d4-a716-446655440000')).toBe(
        '660e...0000',
      );
    });
  });
});
