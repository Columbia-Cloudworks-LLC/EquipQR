// Using Deno.serve (built-in)
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import {
  QBO_API_BASE,
  QBO_ENVIRONMENT,
  QBO_TOKEN_URL,
  getIntuitTid,
  resolveQboTaxStatusMaxCacheAgeHours,
  resolveQboTaxStatusUnconfirmedMode,
  withMinorVersion,
} from "../_shared/quickbooks-config.ts";
import {
  createErrorResponse,
  requireBearerUserJsonUnauthorized,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
import { createRedactedLogStep } from "../_shared/redacted-logger.ts";
import { MissingSecretError } from "../_shared/require-secret.ts";
import {
  createQuickBooksServiceSupabaseClient,
  handleQuickBooksCorsPreflight,
  loadQuickBooksFunctionSecrets,
} from "../_shared/quickbooks-function-bootstrap.ts";
import {
  buildInvoiceLines,
  buildPrivateNote,
  type PreventativeMaintenanceInvoiceRow,
  type WorkOrderCost,
  type WorkOrderData,
  type WorkOrderNote,
} from "./qbo-invoice-lines.ts";
import {
  applyInvoiceTaxState,
  applyTransactionTaxState,
  buildCustomerMemo,
  buildInvoiceCustomFields,
  type QuickBooksInvoice,
  type VerifiedTaxState,
  type WorkOrderStatusEvent,
} from "./qbo-invoice-payload.ts";
import { updateWorkOrderInvoiceMirror } from "./work-order-invoice-mirror.ts";

export { __testables } from "./qbo-invoice-lines.ts";
export { __payloadTestables } from "./qbo-invoice-payload.ts";

const FUNCTION_NAME = "quickbooks-export-invoice";

const logStep = createRedactedLogStep("QUICKBOOKS-EXPORT-INVOICE");

// getIntuitTid imported from _shared/quickbooks-config.ts

/**
 * Extracts the client IP address from request headers.
 * Checks x-forwarded-for (first IP in comma-separated list) and x-real-ip.
 * Returns null if no IP address is found.
 */
const getClientIpAddress = (req: Request): string | null => {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
         req.headers.get("x-real-ip") || 
         null;
};

// QuickBooks API endpoints and environment imported from _shared/quickbooks-config.ts
// QBO_API_BASE, QBO_ENVIRONMENT, QBO_TOKEN_URL, withMinorVersion

import {
  refreshQuickBooksAccessTokenIfNeeded,
  type QuickBooksCredential,
} from "../_shared/quickbooks-token.ts";

interface TeamCustomerMapping {
  quickbooks_customer_id: string;
  display_name: string;
  customer_account_id: string | null;
  cached_is_tax_exempt: boolean | null;
  tax_status_synced_at: string | null;
}

class TaxStatusUnconfirmedError extends Error {
  constructor(message = "QuickBooks tax status could not be confirmed. Please refresh the customer from QuickBooks and try again.") {
    super(message);
    this.name = "TaxStatusUnconfirmedError";
  }
}

const isCacheFresh = (syncedAt: string | null, maxAgeHours: number): boolean => {
  if (!syncedAt) return false;
  const parsed = new Date(syncedAt).getTime();
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed <= maxAgeHours * 60 * 60 * 1000;
};

async function logTaxStatusAudit(
  supabaseClient: SupabaseClient,
  params: {
    organizationId: string;
    customerAccountId: string | null;
    displayName: string;
    action: string;
    previousValue: boolean | null;
    nextValue: boolean | null;
    source: VerifiedTaxState["source"];
  },
): Promise<void> {
  if (!params.customerAccountId) return;
  try {
    const { error } = await supabaseClient.rpc("log_audit_entry", {
      p_organization_id: params.organizationId,
      p_entity_type: "customer",
      p_entity_id: params.customerAccountId,
      p_entity_name: params.displayName,
      p_action: params.action,
      p_changes: {
        is_tax_exempt: {
          old: params.previousValue,
          new: params.nextValue,
        },
      },
      p_metadata: {
        source: "quickbooks",
        tax_status_source: params.source,
      },
    });
    if (error) {
      logStep("Warning: tax status audit logging failed", { error: error.message });
    }
  } catch (error) {
    logStep("Warning: tax status audit logging failed with exception", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function confirmCustomerTaxStatus(
  supabaseClient: SupabaseClient,
  params: {
    accessToken: string;
    realmId: string;
    organizationId: string;
    customerMapping: TeamCustomerMapping;
  },
): Promise<VerifiedTaxState> {
  const headers = {
    Authorization: `Bearer ${params.accessToken}`,
    Accept: "application/json",
  };
  const url = withMinorVersion(
    `${QBO_API_BASE}/v3/company/${params.realmId}/customer/${encodeURIComponent(params.customerMapping.quickbooks_customer_id)}`,
  );
  const maxAgeHours = resolveQboTaxStatusMaxCacheAgeHours();
  const mode = resolveQboTaxStatusUnconfirmedMode();
  const cachedState: VerifiedTaxState = {
    isTaxExempt: params.customerMapping.cached_is_tax_exempt,
    verified: false,
    source: "cache",
  };

  try {
    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      throw new Error(`QuickBooks Customer lookup failed with HTTP ${response.status}`);
    }

    const body = await response.json();
    if (body.Fault) {
      throw new Error(`QuickBooks Customer lookup Fault: ${JSON.stringify(body.Fault).substring(0, 300)}`);
    }

    const taxable = body.Customer?.Taxable;
    if (typeof taxable !== "boolean") {
      throw new Error("QuickBooks Customer.Taxable was not present in the response");
    }

    const nextIsTaxExempt = taxable === false;
    const now = new Date().toISOString();
    if (params.customerMapping.customer_account_id) {
      const { error } = await supabaseClient
        .from("customers")
        .update({
          is_tax_exempt: nextIsTaxExempt,
          quickbooks_tax_status_synced_at: now,
        })
        .eq("id", params.customerMapping.customer_account_id)
        .eq("organization_id", params.organizationId);

      if (error) {
        logStep("Warning: tax status cache update failed", { error: error.message });
      }
    }

    const action = params.customerMapping.cached_is_tax_exempt !== null &&
      params.customerMapping.cached_is_tax_exempt !== nextIsTaxExempt
      ? "quickbooks_tax_status_diverged"
      : "quickbooks_tax_status_read";

    await logTaxStatusAudit(supabaseClient, {
      organizationId: params.organizationId,
      customerAccountId: params.customerMapping.customer_account_id,
      displayName: params.customerMapping.display_name,
      action,
      previousValue: params.customerMapping.cached_is_tax_exempt,
      nextValue: nextIsTaxExempt,
      source: "quickbooks",
    });

    return {
      isTaxExempt: nextIsTaxExempt,
      verified: true,
      source: "quickbooks",
    };
  } catch (error) {
    logStep("QuickBooks tax status confirmation failed", {
      customerId: params.customerMapping.quickbooks_customer_id,
      error: error instanceof Error ? error.message : String(error),
    });

    if (
      cachedState.isTaxExempt !== null &&
      isCacheFresh(params.customerMapping.tax_status_synced_at, maxAgeHours)
    ) {
      return cachedState;
    }

    await logTaxStatusAudit(supabaseClient, {
      organizationId: params.organizationId,
      customerAccountId: params.customerMapping.customer_account_id,
      displayName: params.customerMapping.display_name,
      action: mode === "warn" ? "quickbooks_tax_status_unconfirmed_warn" : "quickbooks_tax_status_unconfirmed_block",
      previousValue: params.customerMapping.cached_is_tax_exempt,
      nextValue: params.customerMapping.cached_is_tax_exempt,
      source: "unconfirmed",
    });

    if (mode === "warn") {
      return {
        isTaxExempt: params.customerMapping.cached_is_tax_exempt,
        verified: false,
        source: "unconfirmed",
      };
    }

    throw new TaxStatusUnconfirmedError();
  }
}

Deno.serve(withCorrelationId(async (req, ctx) => {
  const { corsHeaders, preflightResponse } = handleQuickBooksCorsPreflight(req);
  if (preflightResponse) {
    return preflightResponse;
  }

  try {
    logStep("Function started", { correlation_id: ctx.correlationId });

    const { clientId, clientSecret, supabaseUrl, supabaseServiceKey } =
      loadQuickBooksFunctionSecrets(FUNCTION_NAME);
    const supabaseClient = createQuickBooksServiceSupabaseClient(supabaseUrl, supabaseServiceKey);

    const authResult = await requireBearerUserJsonUnauthorized(
      req,
      supabaseClient,
      corsHeaders,
    );
    if (authResult instanceof Response) {
      return authResult;
    }
    const { user } = authResult;

    // Parse request body
    const body = await req.json();
    const { work_order_id } = body;

    if (!work_order_id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "work_order_id is required" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Loading work order", { workOrderId: work_order_id });

    // Get user's organization memberships where they have admin/owner role
    // This is used to filter the work order query for multi-tenancy enforcement
    const { data: userMemberships, error: membershipQueryError } = await supabaseClient
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin']);

    if (membershipQueryError) {
      logStep("Error fetching user memberships", { error: membershipQueryError.message });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to verify user permissions" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userOrgIds = (userMemberships || []).map(m => m.organization_id);
    
    if (userOrgIds.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "You must be an admin or owner to export invoices" 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load work order with equipment (which contains team_id and team info)
    // Note: Team association comes from the equipment, NOT directly from the work order
    // Multi-tenancy failsafe: filter by user's admin/owner organization memberships
    // This ensures users can only export work orders from organizations where they have admin rights
    const { data: workOrder, error: woError } = await supabaseClient
      .from('work_orders')
      .select(`
        *,
        equipment:equipment_id (
          name, 
          manufacturer, 
          model, 
          serial_number,
          team_id,
          team:team_id (name)
        )
      `)
      .eq('id', work_order_id)
      .in('organization_id', userOrgIds)
      .single();

    if (woError || !workOrder) {
      logStep("Work order not found", { error: woError?.message });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Work order not found" 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user has QuickBooks management permission
    const { data: qbPermission, error: qbPermError } = await supabaseClient
      .rpc('can_user_manage_quickbooks', {
        p_user_id: user.id,
        p_organization_id: workOrder.organization_id
      });

    if (qbPermError) {
      logStep("Error checking QuickBooks permission", { error: qbPermError.message });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to verify user permissions" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!qbPermission) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "You do not have permission to export invoices to QuickBooks" 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Derive team_id from equipment (the correct source of truth for team association)
    const equipmentTeamId = workOrder.equipment?.team_id;
    
    // Check if equipment has a team assigned
    if (!equipmentTeamId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Work order's equipment must be assigned to a team to export to QuickBooks (Work Order ID: ${work_order_id})` 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve QB customer ID: prefer team → customer account, fall back to legacy mapping
    let resolvedQBCustomerId: string | null = null;
    let resolvedDisplayName: string | null = null;
    let resolvedCustomerAccountId: string | null = null;
    let cachedIsTaxExempt: boolean | null = null;
    let taxStatusSyncedAt: string | null = null;

    const { data: teamRow, error: teamError } = await supabaseClient
      .from('teams')
      .select('customer_id')
      .eq('id', equipmentTeamId)
      .eq('organization_id', workOrder.organization_id)
      .single();

    if (teamError) {
      logStep('Error resolving team for QB customer', {
        work_order_id,
        equipmentTeamId,
        organization_id: workOrder.organization_id,
        error: teamError.message,
        code: teamError.code,
      });
    }

    if (teamRow?.customer_id) {
      const { data: customerAccount } = await supabaseClient
        .from('customers')
        .select('id, quickbooks_customer_id, name, is_tax_exempt, quickbooks_tax_status_synced_at')
        .eq('id', teamRow.customer_id)
        .eq('organization_id', workOrder.organization_id)
        .single();

      if (customerAccount?.quickbooks_customer_id) {
        resolvedQBCustomerId = customerAccount.quickbooks_customer_id;
        resolvedDisplayName = customerAccount.name;
        resolvedCustomerAccountId = customerAccount.id;
        cachedIsTaxExempt = customerAccount.is_tax_exempt ?? null;
        taxStatusSyncedAt = customerAccount.quickbooks_tax_status_synced_at ?? null;
      }
    }

    // Fallback to legacy mapping table
    if (!resolvedQBCustomerId) {
      const { data: legacyMapping } = await supabaseClient
        .from('quickbooks_team_customers')
        .select('quickbooks_customer_id, display_name')
        .eq('organization_id', workOrder.organization_id)
        .eq('team_id', equipmentTeamId)
        .single();

      if (legacyMapping) {
        resolvedQBCustomerId = legacyMapping.quickbooks_customer_id;
        resolvedDisplayName = legacyMapping.display_name;
      }
    }

    if (!resolvedQBCustomerId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Team does not have a QuickBooks customer mapping. Please map the team to a QuickBooks customer first." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerMapping: TeamCustomerMapping = {
      quickbooks_customer_id: resolvedQBCustomerId,
      display_name: resolvedDisplayName ?? 'Unknown',
      customer_account_id: resolvedCustomerAccountId,
      cached_is_tax_exempt: cachedIsTaxExempt,
      tax_status_synced_at: taxStatusSyncedAt,
    };

    logStep("Customer mapping found", { 
      customerId: customerMapping.quickbooks_customer_id,
      displayName: customerMapping.display_name 
    });

    // Get QuickBooks credentials
    const { data: credentials, error: credError } = await supabaseClient
      .from('quickbooks_credentials')
      .select('*')
      .eq('organization_id', workOrder.organization_id)
      .single();

    if (credError || !credentials) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "QuickBooks is not connected" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load work order costs
    const { data: costs } = await supabaseClient
      .from('work_order_costs')
      .select('id, description, quantity, unit_price_cents, total_price_cents, inventory_item_id, work_orders!inner(organization_id)')
      .eq('work_order_id', work_order_id)
      .eq('work_orders.organization_id', workOrder.organization_id);

    // Load work order notes
    const { data: notes } = await supabaseClient
      .from('work_order_notes')
      .select('id, content, is_private, author_name, created_at, hours_worked, machine_hours, work_orders!inner(organization_id)')
      .eq('work_order_id', work_order_id)
      .eq('work_orders.organization_id', workOrder.organization_id)
      .order('created_at', { ascending: true });

    const { data: statusHistory } = await supabaseClient
      .from('work_order_status_history')
      .select('id, old_status, new_status, changed_at, reason, work_orders!inner(organization_id)')
      .eq('work_order_id', work_order_id)
      .eq('work_orders.organization_id', workOrder.organization_id)
      .order('changed_at', { ascending: true });

    const { data: pmRow } = await supabaseClient
      .from('preventative_maintenance')
      .select(
        'id, checklist_data, notes, completed_by_name, pm_checklist_templates(name)',
      )
      .eq('work_order_id', work_order_id)
      .eq('organization_id', workOrder.organization_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { accessToken } = await refreshQuickBooksAccessTokenIfNeeded(
      credentials as QuickBooksCredential,
      supabaseClient,
      clientId,
      clientSecret,
      { onPersistError: "silent", log: logStep },
    );

    const taxState = await confirmCustomerTaxStatus(supabaseClient, {
      accessToken,
      realmId: credentials.realm_id,
      organizationId: workOrder.organization_id,
      customerMapping,
    });

    const notesTyped = (notes || []) as WorkOrderNote[];
    const publicNotesText = notesTyped
      .filter((n) => !n.is_private)
      .map((n) => n.content)
      .join("\n");

    let invoiceLines = await buildInvoiceLines(
      accessToken,
      credentials.realm_id,
      (costs || []) as WorkOrderCost[],
      notesTyped,
      {
        workOrder: workOrder as WorkOrderData,
        pm: (pmRow ?? null) as PreventativeMaintenanceInvoiceRow | null,
        publicNotesText,
      },
    );
    if (invoiceLines.length === 0) {
      throw new Error("No billable line items were found for this work order.");
    }
    invoiceLines = applyInvoiceTaxState(invoiceLines, taxState);
    const privateNote = buildPrivateNote(
      workOrder as WorkOrderData,
      (notes || []) as WorkOrderNote[],
      (costs || []) as WorkOrderCost[],
    );
    const customerMemo = buildCustomerMemo(
      workOrder as WorkOrderData,
      (notes || []) as WorkOrderNote[],
      (statusHistory || []) as WorkOrderStatusEvent[],
    );
    const customFields = buildInvoiceCustomFields(
      workOrder as WorkOrderData,
      (notes || []) as WorkOrderNote[],
    );

    // Check if this work order was already exported
    const { data: existingExport } = await supabaseClient
      .from('quickbooks_export_logs')
      .select('quickbooks_invoice_id')
      .eq('work_order_id', work_order_id)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let invoiceId: string | undefined;
    let invoiceNumber: string | undefined;
    let syncedInvoice: QuickBooksInvoice | null = null;
    let isUpdate = false;
    let intuitTid: string | null = null;

    // Create log entry (pending)
    const { data: logEntry } = await supabaseClient
      .from('quickbooks_export_logs')
      .insert({
        organization_id: workOrder.organization_id,
        work_order_id: work_order_id,
        realm_id: credentials.realm_id,
        status: 'pending',
      })
      .select('id')
      .single();

    try {
      if (existingExport?.quickbooks_invoice_id) {
        // Update existing invoice
        logStep("Updating existing invoice", { invoiceId: existingExport.quickbooks_invoice_id });
        
        // First, get the current invoice to get its SyncToken
        const getInvoiceUrl = withMinorVersion(`${QBO_API_BASE}/v3/company/${credentials.realm_id}/invoice/${existingExport.quickbooks_invoice_id}`);
        const getResponse = await fetch(getInvoiceUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
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
          CustomerRef: { value: customerMapping.quickbooks_customer_id },
          Line: invoiceLines,
          CustomField: customFields,
          PrivateNote: privateNote,
          CustomerMemo: { value: customerMemo },
        };
        updatedInvoice = applyTransactionTaxState(updatedInvoice, taxState);

        const updateUrl = withMinorVersion(`${QBO_API_BASE}/v3/company/${credentials.realm_id}/invoice`);
        const updateResponse = await fetch(updateUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
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
            p_organization_id: workOrder.organization_id,
            p_work_order_id: work_order_id,
            p_action: 'UPDATE',
            p_quickbooks_invoice_id: invoiceId,
            p_quickbooks_invoice_number: invoiceNumber,
            p_realm_id: credentials.realm_id,
            p_ip_address: getClientIpAddress(req),
            p_actor_id: user.id
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
        const generatedDocNumber = `WO-${work_order_id.substring(0, 8).toUpperCase()}`;
        logStep("Creating new invoice", { docNumber: generatedDocNumber });

        let newInvoice: QuickBooksInvoice = {
          DocNumber: generatedDocNumber,
          CustomerRef: { value: customerMapping.quickbooks_customer_id },
          Line: invoiceLines,
          CustomField: customFields,
          PrivateNote: privateNote,
          CustomerMemo: { value: customerMemo },
          TxnDate: new Date().toISOString().split('T')[0],
        };

        if (workOrder.due_date) {
          newInvoice.DueDate = workOrder.due_date.split('T')[0];
        }
        newInvoice = applyTransactionTaxState(newInvoice, taxState);

        const createUrl = withMinorVersion(`${QBO_API_BASE}/v3/company/${credentials.realm_id}/invoice`);
        const createResponse = await fetch(createUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
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
            p_organization_id: workOrder.organization_id,
            p_work_order_id: work_order_id,
            p_action: 'CREATE',
            p_quickbooks_invoice_id: invoiceId,
            p_quickbooks_invoice_number: invoiceNumber,
            p_realm_id: credentials.realm_id,
            p_ip_address: getClientIpAddress(req),
            p_actor_id: user.id
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
          workOrderId: work_order_id,
          organizationId: workOrder.organization_id,
          realmId: credentials.realm_id,
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

      return new Response(JSON.stringify({ 
        success: true, 
        invoice_id: invoiceId,
        invoice_number: invoiceNumber,
        is_update: isUpdate,
        environment: QBO_ENVIRONMENT,
        message: isUpdate 
          ? `Invoice ${invoiceNumber} updated successfully` 
          : `Invoice ${invoiceNumber} created successfully`
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

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

  } catch (error) {
    // Log detailed error server-side only - never expose to client
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!(error instanceof MissingSecretError)) {
      logStep("ERROR", { message: errorMessage, correlation_id: ctx.correlationId });
    }

    if (error instanceof TaxStatusUnconfirmedError) {
      return createErrorResponse(error.message, 409, { req });
    }

    return createErrorResponse("An internal error occurred", 500, { req });
  }
}));
