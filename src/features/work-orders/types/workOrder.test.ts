import { describe, it, expect } from 'vitest';
import { isQuickBooksInvoiceStatus, toQuickBooksInvoiceStatus } from './workOrder';

describe('toQuickBooksInvoiceStatus', () => {
  it('narrows known invoice statuses', () => {
    expect(toQuickBooksInvoiceStatus('paid')).toBe('paid');
    expect(isQuickBooksInvoiceStatus('overdue')).toBe(true);
  });

  it('returns null for unknown or empty values', () => {
    expect(toQuickBooksInvoiceStatus('not-a-status')).toBeNull();
    expect(toQuickBooksInvoiceStatus(null)).toBeNull();
    expect(toQuickBooksInvoiceStatus(undefined)).toBeNull();
    expect(isQuickBooksInvoiceStatus('draft-invoice')).toBe(false);
  });
});
