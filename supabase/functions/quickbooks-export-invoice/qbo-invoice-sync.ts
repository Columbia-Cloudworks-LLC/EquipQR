import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import {
  QBO_API_BASE,
  QBO_ENVIRONMENT,
  getIntuitTid,
  withMinorVersion,
} from "../_shared/quickbooks-config.ts";
import type { TeamCustomerMapping } from "./qbo-tax-status.ts";
import type { PreparedInvoiceArtifacts } from "./qbo-export-context.ts";
import {
  applyTransactionTaxState,
  type QuickBooksInvoice,
  type VerifiedTaxState,
} from "./qbo-invoice-payload.ts";
import { updateWorkOrderInvoiceMirror } from "./work-order-invoice-mirror.ts";
import { getClientIpAddress } from "./qbo-work-order-gate.ts";

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
    .from('quickbooks_export_logs')
    .select('quickbooks_invoice_id')
    .eq('work_order_id', params.workOrderId)
    .eq('status', 'success')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let invoiceId: string | undefined;
  let invoiceNumber: string | undefined;
  let syncedInvoice: QuickBooksInvoice | null = null;
  let isUpdate = false;
  let intuitTid: string | null = null;

  const { invoiceLines, privateNote, customerMemo, customFields } = params.artifacts;

  // Create log entry (pending)
  const { data: logEntry } = await supabaseClient
    .from('quickbooks_export_logs')
    .insert({
      organization_id: params.organizationId,
      work_order_id: params.workOrderId,
      realm_id: params.realmId,
      status: 'pending',
    })
    .select('id')
    .single();

  try {
    if (existingExport?.quickbooks_invoice_id) {
      // Update existing invoice
      logStep("Updating existing invoice", { invoiceId: existingExport.quickbooks_invoice_id });
      
      // First, get the current invoice to get its SyncToken
      const getInvoiceUrl = withMinorVersion(`${QBO_API_BASE}/v3/company/${params.realmId}/invoice/${existingExport.quickbooks_invoice_id}`);
      const getResponse = await fetch(getInvoiceUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${params.accessToken}`,
          "Accept": "application/json",
        },
      });

      if (!getResponse.ok) {
        throw new Error("Failed to fetch existing invoice for update");
      }

      const existingInvoiceData = await getResponse.json();
      // Check for Fault in 200 OK response (QBO best practice)
      if (existingInvoiceData.Fault) {
        const faultMsg = JSON.stringify(existingInvoiceData.Fault).substring(0, 300);
        logStep("Fault in invoice read response", { fault: faultMsg });
        throw new Error(`Failed to read existing invoice: ${faultMsg}`);
      }
      const existingInvoice = existingInvoiceData.Invoice;

      // Build updated invoice
      let updatedInvoice: QuickBooksInvoice = {
        Id: existingInvoice.Id,
        SyncToken: existingInvoice.SyncToken,
        CustomerRef: { value: params.customerMapping.quickbooks_customer_id },
        Line: invoiceLines,
        CustomField: customFields,
        PrivateNote: privateNote,
        CustomerMemo: { value: customerMemo },
      };
      updatedInvoice = applyTransactionTaxState(updatedInvoice, params.taxState);

      const updateUrl = withMinorVersion(`${QBO_API_BASE}/v3/company/${params.realmId}/invoice`);
      const updateResponse = await fetch(updateUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${params.accessToken}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedInvoice),
      });

      // Capture intuit_tid from response headers for troubleshooting
      intuitTid = getIntuitTid(updateResponse);

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        logStep("Invoice update failed", { error: errorText, intuit_tid: intuitTid });
        throw new Error("Failed to update invoice in QuickBooks");
      }

      const updateResult = await updateResponse.json();
      // Check for Fault in 200 OK response (QBO best practice)
      if (updateResult.Fault) {
        const faultMsg = JSON.stringify(updateResult.Fault).substring(0, 300);
        logStep("Fault in invoice update response", { fault: faultMsg, intuit_tid: intuitTid });
        throw new Error(`Invoice update Fault: ${faultMsg}`);
      }
      syncedInvoice = updateResult.Invoice as QuickBooksInvoice;
      invoiceId = syncedInvoice.Id;
      invoiceNumber = syncedInvoice.DocNumber;
      isUpdate = true;
      
      logStep("Invoice updated", { invoiceId, invoiceNumber, intuit_tid: intuitTid });

      // Audit log: Track invoice update for compliance
      try {
        const { error: auditError } = await supabaseClient.rpc('log_invoice_export_audit', {
          p_organization_id: params.organizationId,
          p_work_order_id: params.workOrderId,
          p_action: 'UPDATE',
          p_quickbooks_invoice_id: invoiceId,
          p_quickbooks_invoice_number: invoiceNumber,
          p_realm_id: params.realmId,
          p_ip_address: getClientIpAddress(params.req),
          p_actor_id: params.userId
        });
        
        if (auditError) {
          // Log audit error but don't fail the export
          logStep("Warning: Audit logging failed", { 
            error: auditError.message 
          });
        }
      } catch (auditError) {
        // Log unexpected exceptions (network/runtime errors)
        logStep("Warning: Audit logging failed with exception", { 
          error: auditError instanceof Error ? auditError.message : String(auditError) 
        });
      }

    } else {
      // Create new invoice
      // Generate invoice number from work order ID
      // Format: WO-XXXXXXXX (uses the first 8 characters of the work order UUID, uppercase)
      // This ensures uniqueness since work order IDs are UUIDs
      // QuickBooks requires this when "Custom transaction numbers" is enabled in company settings
      const generatedDocNumber = `WO-${params.workOrderId.substring(0, 8).toUpperCase()}`;
      logStep("Creating new invoice", { docNumber: generatedDocNumber });

      let newInvoice: QuickBooksInvoice = {
        DocNumber: generatedDocNumber,
        CustomerRef: { value: params.customerMapping.quickbooks_customer_id },
        Line: invoiceLines,
        CustomField: customFields,
        PrivateNote: privateNote,
        CustomerMemo: { value: customerMemo },
        TxnDate: new Date().toISOString().split('T')[0],
      };

      if (params.workOrderDueDate) {
        newInvoice.DueDate = params.workOrderDueDate.split('T')[0];
      }
      newInvoice = applyTransactionTaxState(newInvoice, params.taxState);

      const createUrl = withMinorVersion(`${QBO_API_BASE}/v3/company/${params.realmId}/invoice`);
      const createResponse = await fetch(createUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${params.accessToken}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newInvoice),
      });

      // Capture intuit_tid from response headers for troubleshooting
      intuitTid = getIntuitTid(createResponse);

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        logStep("Invoice creation failed", { error: errorText, intuit_tid: intuitTid });
        throw new Error("Failed to create invoice in QuickBooks");
      }

      const createResult = await createResponse.json();
      // Check for Fault in 200 OK response (QBO best practice)
      if (createResult.Fault) {
        const faultMsg = JSON.stringify(createResult.Fault).substring(0, 300);
        logStep("Fault in invoice create response", { fault: faultMsg, intuit_tid: intuitTid });
        throw new Error(`Invoice create Fault: ${faultMsg}`);
      }
      syncedInvoice = createResult.Invoice as QuickBooksInvoice;
      invoiceId = syncedInvoice.Id;
      invoiceNumber = syncedInvoice.DocNumber;
      
      logStep("Invoice created", { invoiceId, invoiceNumber, intuit_tid: intuitTid });

      // Audit log: Track invoice creation for compliance
      try {
        const { error: auditError } = await supabaseClient.rpc('log_invoice_export_audit', {
          p_organization_id: params.organizationId,
          p_work_order_id: params.workOrderId,
          p_action: 'CREATE',
          p_quickbooks_invoice_id: invoiceId,
          p_quickbooks_invoice_number: invoiceNumber,
          p_realm_id: params.realmId,
          p_ip_address: getClientIpAddress(params.req),
          p_actor_id: params.userId
        });
        
        if (auditError) {
          // Log audit error but don't fail the export
          logStep("Warning: Audit logging failed", { 
            error: auditError.message 
          });
        }
      } catch (auditError) {
        // Log unexpected exceptions (network/runtime errors)
        logStep("Warning: Audit logging failed with exception", { 
          error: auditError instanceof Error ? auditError.message : String(auditError) 
        });
      }

    }

    // Update log entry with success (including all tracking fields)
    if (logEntry?.id) {
      await supabaseClient
        .from('quickbooks_export_logs')
        .update({
          quickbooks_invoice_id: invoiceId,
          quickbooks_invoice_number: invoiceNumber,
          quickbooks_environment: QBO_ENVIRONMENT,
          status: 'success',
          exported_at: new Date().toISOString(),
          intuit_tid: intuitTid,
        })
        .eq('id', logEntry.id);
    }

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
      environment: QBO_ENVIRONMENT
    });

    return { invoiceId, invoiceNumber, syncedInvoice, isUpdate, intuitTid };
  } catch (exportError) {
    // Update log entry with error (including all tracking fields)
    if (logEntry?.id) {
      const errorMessage = exportError instanceof Error ? exportError.message : String(exportError);
      await supabaseClient
        .from('quickbooks_export_logs')
        .update({
          status: 'error',
          error_message: errorMessage.substring(0, 1000),
          intuit_tid: intuitTid,
          quickbooks_environment: QBO_ENVIRONMENT,
        })
        .eq('id', logEntry.id);
    }
    throw exportError;
  }
}
