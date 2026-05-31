import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

import { QBO_ENVIRONMENT } from "../_shared/quickbooks-config.ts";
import {
  amountToCents,
  deriveQuickBooksInvoiceStatus,
  type QuickBooksInvoice,
} from "./qbo-invoice-payload.ts";

const LOG_PREFIX = "[QUICKBOOKS-EXPORT-INVOICE]";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const safeDetails = details ? { ...details } : undefined;
  if (safeDetails) {
    delete safeDetails.access_token;
    delete safeDetails.refresh_token;
  }
  const detailsStr = safeDetails ? ` - ${JSON.stringify(safeDetails)}` : "";
  console.log(`${LOG_PREFIX} ${step}${detailsStr}`);
};

export async function updateWorkOrderInvoiceMirror(
  supabaseClient: SupabaseClient,
  params: {
    workOrderId: string;
    organizationId: string;
    realmId: string;
    invoice: QuickBooksInvoice;
    operation?: string;
  },
): Promise<void> {
  if (!params.invoice.Id) return;
  const now = new Date();
  const invoiceStatus = deriveQuickBooksInvoiceStatus(params.invoice, params.operation, now);
  const updatePayload: Record<string, unknown> = {
    quickbooks_invoice_id: params.invoice.Id,
    quickbooks_invoice_number: params.invoice.DocNumber ?? null,
    quickbooks_invoice_environment: QBO_ENVIRONMENT,
    quickbooks_realm_id: params.realmId,
    invoice_status: invoiceStatus,
    invoice_balance_cents: amountToCents(params.invoice.Balance),
    invoice_due_date: params.invoice.DueDate ?? null,
    invoice_last_synced_at: now.toISOString(),
    invoice_sync_error: null,
  };

  const { error } = await supabaseClient
    .from("work_orders")
    .update(updatePayload)
    .eq("id", params.workOrderId)
    .eq("organization_id", params.organizationId);

  if (error) {
    logStep("Warning: Work Order invoice mirror update failed — export already succeeded", {
      workOrderId: params.workOrderId,
      organizationId: params.organizationId,
      quickbooks_invoice_id: params.invoice.Id,
      error: error.message,
    });
    return;
  }

  const wasEmailed = params.invoice.EmailStatus?.toLowerCase() === "emailsent";
  const shouldSetSent = wasEmailed && invoiceStatus !== "draft" && invoiceStatus !== "voided";
  const shouldSetPaid = invoiceStatus === "paid";
  const timestamp = now.toISOString();

  if (shouldSetSent) {
    const { error: sentError } = await supabaseClient
      .from("work_orders")
      .update({ invoice_sent_at: timestamp })
      .eq("id", params.workOrderId)
      .eq("organization_id", params.organizationId)
      .is("invoice_sent_at", null);
    if (sentError) {
      logStep("Warning: invoice_sent_at first-write update failed", { error: sentError.message });
    }
  }

  if (shouldSetPaid) {
    const { error: paidError } = await supabaseClient
      .from("work_orders")
      .update({ invoice_paid_at: timestamp })
      .eq("id", params.workOrderId)
      .eq("organization_id", params.organizationId)
      .is("invoice_paid_at", null);
    if (paidError) {
      logStep("Warning: invoice_paid_at first-write update failed", { error: paidError.message });
    }
  }
}
