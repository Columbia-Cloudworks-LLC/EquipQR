import { supabase } from '@/integrations/supabase/client';
import { getInvokeErrorPayload } from '@/services/google-workspace/invokeError';

export interface InvoiceDates {
  invoice_date: string | null;
  due_date: string | null;
  payment_term_id: string | null;
  service_dates: Record<string, string>;
}

export interface InvoiceTerm {
  id: string;
  name: string;
  due_days: number | null;
  day_of_month_due: number | null;
  due_next_month_days: number | null;
}

export interface InvoiceReview {
  source_fingerprint: string;
  saved_details: InvoiceDates | null;
  terms: InvoiceTerm[];
  customer_term_id: string | null;
  existing_invoice: {
    id: string;
    sync_token: string;
    invoice_date: string | null;
    due_date: string | null;
    payment_term_id: string | null;
  } | null;
  services: Array<{
    key: string;
    description: string;
    service_date: string | null;
    quantity: number;
    unit_price: number;
    amount: number;
  }>;
  blocking_reason: string | null;
}

export interface InvoiceConfirmation extends InvoiceDates {
  source_fingerprint: string;
  existing_invoice_id: string | null;
  existing_sync_token: string | null;
  overwrite_existing_dates: boolean;
}

export async function getInvoiceReview(workOrderId: string): Promise<InvoiceReview> {
  const { data, error } = await supabase.functions.invoke<InvoiceReview & { error?: string }>(
    'quickbooks-export-invoice', { body: { work_order_id: workOrderId, action: 'review' } },
  );
  if (error) {
    const payload = await getInvokeErrorPayload(error);
    throw new Error(payload?.error || error.message);
  }
  if (!data || data.error) throw new Error(data?.error || 'Unable to review this invoice');
  return data;
}

export async function saveInvoiceDates(workOrderId: string, organizationId: string, dates: InvoiceDates) {
  const { error } = await supabase.from('work_order_invoice_details').upsert({
    work_order_id: workOrderId, organization_id: organizationId, ...dates,
  }, { onConflict: 'work_order_id' });
  if (error) throw new Error(error.message);
}

/** Calendar arithmetic uses the selected date only, never the current clock. */
export function calculateInvoiceDueDate(invoiceDate: string, term: InvoiceTerm): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate)) return null;
  const date = new Date(`${invoiceDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== invoiceDate) return null;
  if (term.due_days !== null) {
    date.setUTCDate(date.getUTCDate() + term.due_days);
    return date.toISOString().slice(0, 10);
  }
  if (term.day_of_month_due === null) return null;
  const dueInMonth = (year: number, month: number) => new Date(Date.UTC(
    year, month, Math.min(term.day_of_month_due!, new Date(Date.UTC(year, month + 1, 0)).getUTCDate()),
  ));
  let due = dueInMonth(date.getUTCFullYear(), date.getUTCMonth());
  if (due < date || (due.getTime() - date.getTime()) / 86400000 < (term.due_next_month_days ?? 0)) {
    due = dueInMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
  }
  return due.toISOString().slice(0, 10);
}
