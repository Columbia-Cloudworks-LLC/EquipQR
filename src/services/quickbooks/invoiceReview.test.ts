import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { createMockSupabaseClient } from '@vitest-harness/utils/mock-supabase';

vi.mock('@/integrations/supabase/client', () => ({ supabase: createMockSupabaseClient() }));
import { supabase } from '@/integrations/supabase/client';
import { calculateInvoiceDueDate, getInvoiceReview, type InvoiceTerm } from './invoiceReview';

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


describe('invoice review rollout safety', () => {
  beforeEach(() => vi.clearAllMocks());

  it('never supplies the legacy export identifier, even when the old handler ignores action', async () => {
    let legacyExports = 0;
    vi.mocked(supabase.functions.invoke).mockImplementation(async (_name, options) => {
      const body = options?.body as Record<string, unknown>;
      if (body.work_order_id) {
        legacyExports++;
        return { data: { success: true, invoice_id: 'unintended-invoice' }, error: null };
      }
      return { data: null, error: new FunctionsHttpError(new Response(
        JSON.stringify({ error: 'work_order_id is required' }), { status: 400 },
      )) };
    });
    await expect(getInvoiceReview('historical-work-order')).rejects.toThrow('Invoice review is temporarily unavailable');
    expect(legacyExports).toBe(0);
    expect(supabase.functions.invoke).toHaveBeenCalledExactlyOnceWith('quickbooks-export-invoice', {
      body: { action: 'review', review_work_order_id: 'historical-work-order' },
    });
  });

  it('returns the review from a compatible backend', async () => {
    const review = { services: [], source_fingerprint: 'current' };
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: review, error: null });
    await expect(getInvoiceReview('work-order')).resolves.toEqual(review);
  });

  it('rejects an unexpected export response instead of rendering a broken dialog', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { success: true }, error: null });
    await expect(getInvoiceReview('work-order')).rejects.toThrow('Invoice review is temporarily unavailable');
  });
});
