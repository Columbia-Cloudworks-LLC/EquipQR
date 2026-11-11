import { describe, it, expect } from 'vitest';
import { isQuickBooksInvoiceStatus } from './workOrder';

describe('isQuickBooksInvoiceStatus', () => {
  it('accepts known invoice statuses', () => {
    expect(isQuickBooksInvoiceStatus('paid')).toBe(true);
    expect(isQuickBooksInvoiceStatus('overdue')).toBe(true);
  });

  it('rejects unknown or empty values', () => {
    expect(isQuickBooksInvoiceStatus('not-a-status')).toBe(false);
    expect(isQuickBooksInvoiceStatus(null)).toBe(false);
    expect(isQuickBooksInvoiceStatus(undefined)).toBe(false);
    expect(isQuickBooksInvoiceStatus('draft-invoice')).toBe(false);
  });
});
