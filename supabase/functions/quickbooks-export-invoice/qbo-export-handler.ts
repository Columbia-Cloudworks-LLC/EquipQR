import {
  type InvoiceConfirmation,
  InvoiceReviewError,
  invoiceSourceFingerprint,
  loadInvoiceReviewContext,
  mergeInvoiceLines,
  updateBlockingReason,
  validateConfirmation,
} from "./qbo-invoice-review.ts";
import { getInvoiceServiceDescriptors } from "./qbo-invoice-lines.ts";
import { QBO_ENVIRONMENT } from "../_shared/quickbooks-config.ts";
import {
  createErrorResponse,
  requireBearerUserJsonUnauthorized,
} from "../_shared/supabase-clients.ts";
import { MissingSecretError } from "../_shared/require-secret.ts";
import type { QuickBooksHandlerContext } from "../_shared/quickbooks-serve.ts";
import {
  type QuickBooksCredential,
  refreshQuickBooksAccessTokenIfNeeded,
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
  buildPreparedInvoiceArtifacts,
  loadWorkOrderExportContext,
} from "./qbo-export-context.ts";
import { syncInvoiceToQuickBooks } from "./qbo-invoice-sync.ts";

export async function handleQuickBooksExportInvoice(
  context: QuickBooksHandlerContext,
  logStep: (step: string, details?: Record<string, unknown>) => void,
): Promise<Response> {
  const { req, ctx, corsHeaders, secrets, supabaseClient } = context;

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

    let body: {
      work_order_id?: string;
      action?: "review" | "export";
      confirmation?: InvoiceConfirmation;
    };
    try {
      body = await req.json();
    } catch {
      return createErrorResponse("Invalid JSON body", 400, { req });
    }
    const { work_order_id } = body;

    if (!work_order_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "work_order_id is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    logStep("Loading work order", { workOrderId: work_order_id });

    const { orgIds: userOrgIds, error: membershipError } =
      await loadAdminOrganizationIds(
        supabaseClient,
        user.id,
      );

    if (membershipError) {
      logStep("Error fetching user memberships", { error: membershipError });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to verify user permissions",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (userOrgIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "You must be an admin or owner to export invoices",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { workOrder, error: woError, notFound } =
      await loadWorkOrderForExport(
        supabaseClient,
        work_order_id,
        userOrgIds,
      );

    if (!workOrder) {
      if (notFound) {
        logStep("Work order not found");
        return createErrorResponse("Work order not found", 404, { req });
      }

      logStep("Error loading work order", { error: woError });
      return createErrorResponse("Failed to load work order", 500, { req });
    }

    const organizationId = workOrder.organization_id as string;

    const { allowed, error: qbPermError } =
      await verifyQuickBooksManagePermission(
        supabaseClient,
        user.id,
        organizationId,
      );

    if (qbPermError) {
      logStep("Error checking QuickBooks permission", { error: qbPermError });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to verify user permissions",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "You do not have permission to export invoices to QuickBooks",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const equipmentTeamId = (workOrder.equipment as { team_id?: string } | null)
      ?.team_id;

    if (!equipmentTeamId) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            `Work order's equipment must be assigned to a team to export to QuickBooks (Work Order ID: ${work_order_id})`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const customerMapping = await resolveTeamCustomerMapping(
      supabaseClient,
      logStep,
      {
        workOrderId: work_order_id,
        equipmentTeamId,
        organizationId,
      },
    );

    if (!customerMapping) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Team does not have a QuickBooks customer mapping. Please map the team to a QuickBooks customer first.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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
      return new Response(
        JSON.stringify({
          success: false,
          error: "QuickBooks is not connected",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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

    const reviewContext = await loadInvoiceReviewContext(
      supabaseClient,
      accessToken,
      credentials.realm_id,
      work_order_id,
      organizationId,
      customerMapping.quickbooks_customer_id,
      logStep,
    );
    const services = getInvoiceServiceDescriptors(
      exportContext.costs,
      exportContext.notes,
      {
        workOrder: workOrder as unknown as WorkOrderData,
        pm: exportContext.pmRow,
      },
    );
    const sourceFingerprint = await invoiceSourceFingerprint({
      workOrder,
      exportContext,
      customerId: customerMapping.quickbooks_customer_id,
      services,
    });
    const blockingReason = updateBlockingReason(
      reviewContext.existing,
      reviewContext.saved,
      services,
      credentials.realm_id,
    );
    if (body.action === "review") {
      const existing = reviewContext.existing;
      return new Response(
        JSON.stringify({
          success: true,
          source_fingerprint: sourceFingerprint,
          saved_details: reviewContext.hasSavedDetails
            ? reviewContext.saved
            : null,
          terms: reviewContext.terms,
          customer_term_id: reviewContext.customerTermId,
          existing_invoice: existing
            ? {
              id: existing.Id,
              sync_token: existing.SyncToken,
              invoice_date: existing.TxnDate ?? null,
              due_date: existing.DueDate ?? null,
              payment_term_id: existing.SalesTermRef?.value ?? null,
            }
            : null,
          services: services.map((service) => {
            const line = existing?.Line.find((line) =>
              line.Id === reviewContext.saved.qb_line_ids[service.key]
            );
            return {
              ...service,
              service_date: line?.SalesItemLineDetail?.ServiceDate ??
                reviewContext.saved.service_dates[service.key] ?? null,
              quantity: line?.SalesItemLineDetail?.Qty ?? service.quantity,
              unit_price: line?.SalesItemLineDetail?.UnitPrice ??
                service.unit_price,
              amount: line?.Amount ?? service.amount,
            };
          }),
          blocking_reason: blockingReason,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (body.action !== "export") {
      throw new InvoiceReviewError(
        "Review and confirm invoice details before exporting.",
      );
    }
    if (blockingReason) throw new InvoiceReviewError(blockingReason);
    if (body.confirmation?.source_fingerprint !== sourceFingerprint) {
      throw new InvoiceReviewError(
        "Work order billing details changed since review. Reload and review the invoice again.",
      );
    }
    const confirmation = validateConfirmation(
      body.confirmation,
      reviewContext.existing,
      services,
      reviewContext.terms,
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
      workOrder as unknown as WorkOrderData,
      exportContext,
      taxState,
      confirmation.service_dates,
    );

    artifacts.invoiceLines = mergeInvoiceLines(
      artifacts.invoiceLines,
      services,
      reviewContext.existing,
      reviewContext.saved,
      confirmation,
      credentials.realm_id,
    );
    const { invoiceId, invoiceNumber, isUpdate } =
      await syncInvoiceToQuickBooks(
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
          confirmation,
          savedDetails: reviewContext.saved,
          services,
        },
      );

    return new Response(
      JSON.stringify({
        success: true,
        invoice_id: invoiceId,
        invoice_number: invoiceNumber,
        is_update: isUpdate,
        environment: QBO_ENVIRONMENT,
        message: isUpdate
          ? `Invoice ${invoiceNumber} updated successfully`
          : `Invoice ${invoiceNumber} created successfully`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!(error instanceof MissingSecretError)) {
      logStep("ERROR", {
        message: errorMessage,
        correlation_id: ctx.correlationId,
      });
    }

    if (
      error instanceof TaxStatusUnconfirmedError ||
      error instanceof InvoiceReviewError
    ) {
      return createErrorResponse(error.message, 409, { req });
    }

    return createErrorResponse("An internal error occurred", 500, { req });
  }
}
