// Using Deno.serve (built-in)
import { QBO_ENVIRONMENT } from "../_shared/quickbooks-config.ts";
import {
  createErrorResponse,
  requireBearerUserJsonUnauthorized,
} from "../_shared/supabase-clients.ts";
import { createRedactedLogStep } from "../_shared/redacted-logger.ts";
import { MissingSecretError } from "../_shared/require-secret.ts";
import { serveQuickBooksFunction } from "../_shared/quickbooks-serve.ts";
import {
  refreshQuickBooksAccessTokenIfNeeded,
  type QuickBooksCredential,
} from "../_shared/quickbooks-token.ts";
import type { WorkOrderData } from "./qbo-invoice-lines.ts";
import {
  loadAdminOrganizationIds,
  loadWorkOrderForExport,
  verifyQuickBooksManagePermission,
} from "./qbo-work-order-gate.ts";
import { resolveTeamCustomerMapping } from "./qbo-customer-resolve.ts";
import {
  confirmCustomerTaxStatus,
  TaxStatusUnconfirmedError,
} from "./qbo-tax-status.ts";
import {
  loadWorkOrderExportContext,
  buildPreparedInvoiceArtifacts,
} from "./qbo-export-context.ts";
import { syncInvoiceToQuickBooks } from "./qbo-invoice-sync.ts";

export { __testables } from "./qbo-invoice-lines.ts";
export { __payloadTestables } from "./qbo-invoice-payload.ts";

const FUNCTION_NAME = "quickbooks-export-invoice";

const logStep = createRedactedLogStep("QUICKBOOKS-EXPORT-INVOICE");

serveQuickBooksFunction(FUNCTION_NAME, logStep, async ({
  req,
  ctx,
  corsHeaders,
  secrets,
  supabaseClient,
}) => {
  try {
    const { clientId, clientSecret } = secrets;

    const authResult = await requireBearerUserJsonUnauthorized(
      req,
      supabaseClient,
      corsHeaders,
    );
    if (authResult instanceof Response) {
      return authResult;
    }
    const { user } = authResult;

    const body = await req.json();
    const { work_order_id } = body;

    if (!work_order_id) {
      return new Response(JSON.stringify({
        success: false,
        error: "work_order_id is required",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Loading work order", { workOrderId: work_order_id });

    const { orgIds: userOrgIds, error: membershipError } = await loadAdminOrganizationIds(
      supabaseClient,
      user.id,
    );

    if (membershipError) {
      logStep("Error fetching user memberships", { error: membershipError });
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to verify user permissions",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userOrgIds.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "You must be an admin or owner to export invoices",
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { workOrder, error: woError } = await loadWorkOrderForExport(
      supabaseClient,
      work_order_id,
      userOrgIds,
    );

    if (!workOrder) {
      logStep("Work order not found", { error: woError });
      return new Response(JSON.stringify({
        success: false,
        error: "Work order not found",
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const organizationId = workOrder.organization_id as string;

    const { allowed, error: qbPermError } = await verifyQuickBooksManagePermission(
      supabaseClient,
      user.id,
      organizationId,
    );

    if (qbPermError) {
      logStep("Error checking QuickBooks permission", { error: qbPermError });
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to verify user permissions",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!allowed) {
      return new Response(JSON.stringify({
        success: false,
        error: "You do not have permission to export invoices to QuickBooks",
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const equipmentTeamId = (workOrder.equipment as { team_id?: string } | null)?.team_id;

    if (!equipmentTeamId) {
      return new Response(JSON.stringify({
        success: false,
        error: `Work order's equipment must be assigned to a team to export to QuickBooks (Work Order ID: ${work_order_id})`,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerMapping = await resolveTeamCustomerMapping(supabaseClient, logStep, {
      workOrderId: work_order_id,
      equipmentTeamId,
      organizationId,
    });

    if (!customerMapping) {
      return new Response(JSON.stringify({
        success: false,
        error: "Team does not have a QuickBooks customer mapping. Please map the team to a QuickBooks customer first.",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Customer mapping found", {
      customerId: customerMapping.quickbooks_customer_id,
      displayName: customerMapping.display_name,
    });

    const { data: credentials, error: credError } = await supabaseClient
      .from("quickbooks_credentials")
      .select("*")
      .eq("organization_id", organizationId)
      .single();

    if (credError || !credentials) {
      return new Response(JSON.stringify({
        success: false,
        error: "QuickBooks is not connected",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const exportContext = await loadWorkOrderExportContext(
      supabaseClient,
      work_order_id,
      organizationId,
    );

    const { accessToken } = await refreshQuickBooksAccessTokenIfNeeded(
      credentials as QuickBooksCredential,
      supabaseClient,
      clientId,
      clientSecret,
      { onPersistError: "silent", log: logStep },
    );

    const taxState = await confirmCustomerTaxStatus(supabaseClient, logStep, {
      accessToken,
      realmId: credentials.realm_id,
      organizationId,
      customerMapping,
    });

    const artifacts = await buildPreparedInvoiceArtifacts(
      accessToken,
      credentials.realm_id,
      workOrder as WorkOrderData,
      exportContext,
      taxState,
    );

    const { invoiceId, invoiceNumber, isUpdate } = await syncInvoiceToQuickBooks(
      supabaseClient,
      logStep,
      {
        req,
        userId: user.id,
        workOrderId: work_order_id,
        organizationId,
        realmId: credentials.realm_id,
        accessToken,
        customerMapping,
        taxState,
        artifacts,
        workOrderDueDate: workOrder.due_date as string | null | undefined,
      },
    );

    return new Response(JSON.stringify({
      success: true,
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      is_update: isUpdate,
      environment: QBO_ENVIRONMENT,
      message: isUpdate
        ? `Invoice ${invoiceNumber} updated successfully`
        : `Invoice ${invoiceNumber} created successfully`,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!(error instanceof MissingSecretError)) {
      logStep("ERROR", { message: errorMessage, correlation_id: ctx.correlationId });
    }

    if (error instanceof TaxStatusUnconfirmedError) {
      return createErrorResponse(error.message, 409, { req });
    }

    return createErrorResponse("An internal error occurred", 500, { req });
  }
});
