import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

import {
  QBO_ENVIRONMENT,
} from "../_shared/quickbooks-config.ts";
import {
  amountToCents,
  deriveQuickBooksInvoiceStatus,
  type QuickBooksInvoice,
} from "../quickbooks-export-invoice/qbo-invoice-payload.ts";

export async function updateMirroredWorkOrders(
  supabaseClient: SupabaseClient,
  params: {
    organizationId: string;
    realmId: string;
    invoice: QuickBooksInvoice;
    operation?: string;
  },
): Promise<number> {
  if (!params.invoice.Id) return 0;
  const now = new Date();
  const invoiceStatus = deriveQuickBooksInvoiceStatus(params.invoice, params.operation, now);
  const updatePayload: Record<string, unknown> = {
    quickbooks_invoice_number: params.invoice.DocNumber ?? null,
    quickbooks_invoice_environment: QBO_ENVIRONMENT,
    quickbooks_realm_id: params.realmId,
    invoice_status: invoiceStatus,
    invoice_balance_cents: amountToCents(params.invoice.Balance),
    invoice_due_date: params.invoice.DueDate ?? null,
    invoice_last_synced_at: now.toISOString(),
    invoice_sync_error: null,
  };

  const { data, error } = await supabaseClient
    .from("work_orders")
    .update(updatePayload)
    .eq("organization_id", params.organizationId)
    .eq("quickbooks_realm_id", params.realmId)
    .eq("quickbooks_invoice_id", params.invoice.Id)
    .select("id");

  if (error) throw error;

  const wasEmailed = params.invoice.EmailStatus?.toLowerCase() === "emailsent";
  const shouldSetSent = wasEmailed && invoiceStatus !== "draft" && invoiceStatus !== "voided";
  const shouldSetPaid = invoiceStatus === "paid";
  const timestamp = now.toISOString();

  if (shouldSetSent) {
    const { error: sentError } = await supabaseClient
      .from("work_orders")
      .update({ invoice_sent_at: timestamp })
      .eq("organization_id", params.organizationId)
      .eq("quickbooks_realm_id", params.realmId)
      .eq("quickbooks_invoice_id", params.invoice.Id)
      .is("invoice_sent_at", null);
    if (sentError) throw sentError;
  }

  if (shouldSetPaid) {
    const { error: paidError } = await supabaseClient
      .from("work_orders")
      .update({ invoice_paid_at: timestamp })
      .eq("organization_id", params.organizationId)
      .eq("quickbooks_realm_id", params.realmId)
      .eq("quickbooks_invoice_id", params.invoice.Id)
      .is("invoice_paid_at", null);
    if (paidError) throw paidError;
  }

  return data?.length ?? 0;
}
