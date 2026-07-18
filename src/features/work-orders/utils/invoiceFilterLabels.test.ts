import { describe, it, expect } from 'vitest';
import { formatInvoiceFilterLabel } from './invoiceFilterLabels';

describe('formatInvoiceFilterLabel', () => {
  it('maps known invoice filter values to user-facing labels', () => {
    expect(formatInvoiceFilterLabel('paid')).toBe('Paid');
    expect(formatInvoiceFilterLabel('unpaid')).toBe('Unpaid');
    expect(formatInvoiceFilterLabel('overdue')).toBe('Overdue');
    expect(formatInvoiceFilterLabel('not_exported')).toBe('Not exported');
  });

  it('returns the raw value for unknown filters', () => {
    expect(formatInvoiceFilterLabel('custom')).toBe('custom');
  });
});
