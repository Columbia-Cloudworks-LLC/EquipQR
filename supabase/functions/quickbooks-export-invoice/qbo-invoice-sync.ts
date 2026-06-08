import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { QBO_ENVIRONMENT } from "../_shared/quickbooks-config.ts";
import type { TeamCustomerMapping } from "./qbo-tax-status.ts";
import type { PreparedInvoiceArtifacts } from "./qbo-export-context.ts";
import type { QuickBooksInvoice, VerifiedTaxState } from "./qbo-invoice-payload.ts";
import { updateWorkOrderInvoiceMirror } from "./work-order-invoice-mirror.ts";
import { getClientIpAddress } from "./qbo-work-order-gate.ts";
import {
  createPendingExportLog,
  markExportError,
  markExportSuccess,
} from "./qbo-export-log.ts";
import { logInvoiceExportAudit } from "./qbo-invoice-audit.ts";
import {
  createQuickBooksInvoice,
  fetchExistingInvoiceForUpdate,
  updateQuickBooksInvoice,
} from "./qbo-invoice-api.ts";

export interface InvoiceSyncResult {
  invoiceId: string | undefined;
  invoiceNumber: string | undefined;
  syncedInvoice: QuickBooksInvoice | null;
  isUpdate: boolean;
  intuitTid: string | null;
}

export async function syncInvoiceToQuickBooks(
  supabaseClient: SupabaseClient,
  logStep: (step: string, details?: Record<string, unknown>) => void,
  params: {
    req: Request;
    userId: string;
    workOrderId: string;
    organizationId: string;
    realmId: string;
    accessToken: string;
    customerMapping: TeamCustomerMapping;
    taxState: VerifiedTaxState;
    artifacts: PreparedInvoiceArtifacts;
    workOrderDueDate: string | null | undefined;
  },
): Promise<InvoiceSyncResult> {
  const { data: existingExport } = await supabaseClient
    .from("quickbooks_export_logs")
    .select("quickbooks_invoice_id")
    .eq("work_order_id", params.workOrderId)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let invoiceId: string | undefined;
  let invoiceNumber: string | undefined;
  let syncedInvoice: QuickBooksInvoice | null = null;
  let isUpdate = false;
  let intuitTid: string | null = null;

  const logEntryId = await createPendingExportLog(supabaseClient, {
    organizationId: params.organizationId,
    workOrderId: params.workOrderId,
    realmId: params.realmId,
  });

  try {
    if (existingExport?.quickbooks_invoice_id) {
      logStep("Updating existing invoice", { invoiceId: existingExport.quickbooks_invoice_id });

      const existingInvoice = await fetchExistingInvoiceForUpdate(
        params.accessToken,
        params.realmId,
        existingExport.quickbooks_invoice_id,
        logStep,
      );

      const updateResult = await updateQuickBooksInvoice(
        params.accessToken,
        params.realmId,
        existingInvoice,
        params.customerMapping,
        params.artifacts,
        params.taxState,
        logStep,
      );

      syncedInvoice = updateResult.invoice;
      invoiceId = syncedInvoice.Id;
      invoiceNumber = syncedInvoice.DocNumber;
      isUpdate = true;
      intuitTid = updateResult.intuitTid;

      logStep("Invoice updated", { invoiceId, invoiceNumber, intuit_tid: intuitTid });

      await logInvoiceExportAudit(supabaseClient, logStep, {
        organizationId: params.organizationId,
        workOrderId: params.workOrderId,
        action: "UPDATE",
        invoiceId,
        invoiceNumber,
        realmId: params.realmId,
        ipAddress: getClientIpAddress(params.req),
        actorId: params.userId,
      });
    } else {
      const createResult = await createQuickBooksInvoice(
        params.accessToken,
        params.realmId,
        params.workOrderId,
        params.customerMapping,
        params.artifacts,
        params.taxState,
        params.workOrderDueDate,
        logStep,
      );

      syncedInvoice = createResult.invoice;
      invoiceId = syncedInvoice.Id;
      invoiceNumber = syncedInvoice.DocNumber;
      intuitTid = createResult.intuitTid;

      logStep("Invoice created", { invoiceId, invoiceNumber, intuit_tid: intuitTid });

      await logInvoiceExportAudit(supabaseClient, logStep, {
        organizationId: params.organizationId,
        workOrderId: params.workOrderId,
        action: "CREATE",
        invoiceId,
        invoiceNumber,
        realmId: params.realmId,
        ipAddress: getClientIpAddress(params.req),
        actorId: params.userId,
      });
    }

    await markExportSuccess(supabaseClient, logEntryId, {
      invoiceId,
      invoiceNumber,
      intuitTid,
    });

    if (syncedInvoice) {
      await updateWorkOrderInvoiceMirror(supabaseClient, {
        workOrderId: params.workOrderId,
        organizationId: params.organizationId,
        realmId: params.realmId,
        invoice: syncedInvoice,
        operation: isUpdate ? "Update" : "Create",
      });
    }

    logStep("Invoice exported successfully", {
      invoiceId,
      invoiceNumber,
      isUpdate,
      intuit_tid: intuitTid,
      environment: QBO_ENVIRONMENT,
    });

    return { invoiceId, invoiceNumber, syncedInvoice, isUpdate, intuitTid };
  } catch (exportError) {
    const errorMessage = exportError instanceof Error ? exportError.message : String(exportError);
    await markExportError(supabaseClient, logEntryId, {
      errorMessage,
      intuitTid,
    });
    throw exportError;
  }
}
