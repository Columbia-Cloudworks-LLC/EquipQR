import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { QBO_ENVIRONMENT } from "../_shared/quickbooks-config.ts";

export async function createPendingExportLog(
  supabaseClient: SupabaseClient,
  params: {
    organizationId: string;
    workOrderId: string;
    realmId: string;
  },
): Promise<string | undefined> {
  const { data: logEntry } = await supabaseClient
    .from("quickbooks_export_logs")
    .insert({
      organization_id: params.organizationId,
      work_order_id: params.workOrderId,
      realm_id: params.realmId,
      status: "pending",
    })
    .select("id")
    .single();

  return logEntry?.id;
}

export async function markExportSuccess(
  supabaseClient: SupabaseClient,
  logEntryId: string | undefined,
  params: {
    invoiceId: string | undefined;
    invoiceNumber: string | undefined;
    intuitTid: string | null;
  },
): Promise<void> {
  if (!logEntryId) return;

  await supabaseClient
    .from("quickbooks_export_logs")
    .update({
      quickbooks_invoice_id: params.invoiceId,
      quickbooks_invoice_number: params.invoiceNumber,
      quickbooks_environment: QBO_ENVIRONMENT,
      status: "success",
      exported_at: new Date().toISOString(),
      intuit_tid: params.intuitTid,
    })
    .eq("id", logEntryId);
}

export async function markExportError(
  supabaseClient: SupabaseClient,
  logEntryId: string | undefined,
  params: {
    errorMessage: string;
    intuitTid: string | null;
  },
): Promise<void> {
  if (!logEntryId) return;

  await supabaseClient
    .from("quickbooks_export_logs")
    .update({
      status: "error",
      error_message: params.errorMessage.substring(0, 1000),
      intuit_tid: params.intuitTid,
      quickbooks_environment: QBO_ENVIRONMENT,
    })
    .eq("id", logEntryId);
}
