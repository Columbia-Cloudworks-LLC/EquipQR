import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

export async function logInvoiceExportAudit(
  supabaseClient: SupabaseClient,
  logStep: (step: string, details?: Record<string, unknown>) => void,
  params: {
    organizationId: string;
    workOrderId: string;
    action: "CREATE" | "UPDATE";
    invoiceId: string | undefined;
    invoiceNumber: string | undefined;
    realmId: string;
    ipAddress: string | null;
    actorId: string;
  },
): Promise<void> {
  try {
    const { error: auditError } = await supabaseClient.rpc("log_invoice_export_audit", {
      p_organization_id: params.organizationId,
      p_work_order_id: params.workOrderId,
      p_action: params.action,
      p_quickbooks_invoice_id: params.invoiceId,
      p_quickbooks_invoice_number: params.invoiceNumber,
      p_realm_id: params.realmId,
      p_ip_address: params.ipAddress,
      p_actor_id: params.actorId,
    });

    if (auditError) {
      logStep("Warning: Audit logging failed", {
        error: auditError.message,
      });
    }
  } catch (auditError) {
    logStep("Warning: Audit logging failed with exception", {
      error: auditError instanceof Error ? auditError.message : String(auditError),
    });
  }
}
