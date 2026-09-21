import { describe, expect, it } from 'vitest';
import { calculateInvoiceDueDate, type InvoiceTerm } from './invoiceReview';

const net30: InvoiceTerm = { id: '1', name: 'Net 30', due_days: 30, day_of_month_due: null, due_next_month_days: null };
describe('invoice calendar dates', () => {
  it('calculates from the chosen historical invoice date', () => {
    expect(calculateInvoiceDueDate('2020-09-21', net30)).toBe('2020-10-21');
    expect(calculateInvoiceDueDate('2024-02-01', net30)).toBe('2024-03-02');
  });
  it('does not invent missing or impossible dates', () => {
    expect(calculateInvoiceDueDate('', net30)).toBeNull();
    expect(calculateInvoiceDueDate('2026-02-30', net30)).toBeNull();
  });
  it('handles monthly due dates and cutoff windows', () => {
    const monthly: InvoiceTerm = { ...net30, due_days: null, day_of_month_due: 15, due_next_month_days: 5 };
    expect(calculateInvoiceDueDate('2026-09-01', monthly)).toBe('2026-09-15');
    expect(calculateInvoiceDueDate('2026-09-12', monthly)).toBe('2026-10-15');
    expect(calculateInvoiceDueDate('2026-12-20', monthly)).toBe('2027-01-15');
    expect(calculateInvoiceDueDate('2026-02-01', { ...monthly, day_of_month_due: 31 })).toBe('2026-02-28');
  });
});
