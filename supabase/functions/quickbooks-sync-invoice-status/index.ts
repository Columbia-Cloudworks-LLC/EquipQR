import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import {
  QBO_API_BASE,
  QBO_TOKEN_URL,
  getIntuitTid,
  withMinorVersion,
} from "../_shared/quickbooks-config.ts";
import { MissingSecretError, requireSecret } from "../_shared/require-secret.ts";
import {
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
import { deriveQuickBooksInvoiceStatus, type QuickBooksInvoice } from "../quickbooks-export-invoice/qbo-invoice-payload.ts";
import {
  extractLinkedInvoiceIdsFromPayment,
  fetchPayment,
} from "./payment-linked-invoices.ts";
import { updateMirroredWorkOrders } from "./mirror-work-orders.ts";

const FUNCTION_NAME = "quickbooks-sync-invoice-status";
const EVENT_BATCH_SIZE = 25;
const RECONCILE_BATCH_SIZE = 50;

const logStep = (step: string, details?: Record<string, unknown>) => {
  const safeDetails = details ? { ...details } : undefined;
  if (safeDetails) {
    delete safeDetails.access_token;
    delete safeDetails.refresh_token;
  }
  console.log(`[QUICKBOOKS-INVOICE-STATUS] ${step}${safeDetails ? ` - ${JSON.stringify(safeDetails)}` : ""}`);
};

interface QuickBooksCredential {
  id: string;
  organization_id: string;
  realm_id: string;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
}

interface IntuitTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
}

interface InvoiceEvent {
  id: string;
  organization_id: string;
  realm_id: string;
  entity_name: "Invoice" | "Payment";
  entity_id: string;
  operation: string;
  attempts: number;
}

function validateServiceRoleAuth(req: Request, expected: string): boolean {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;
  const [scheme, token] = authHeader.trim().split(/\s+/);
  return scheme?.toLowerCase() === "bearer" && token === expected;
}

async function refreshTokenIfNeeded(
  credential: QuickBooksCredential,
  supabaseClient: any,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const now = new Date();
  if (new Date(credential.access_token_expires_at) > new Date(now.getTime() + 5 * 60 * 1000)) {
    return credential.access_token;
  }

  if (new Date(credential.refresh_token_expires_at) <= now) {
    throw new Error("QuickBooks refresh token expired");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: credential.refresh_token,
  });

  const response = await fetch(QBO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      Accept: "application/json",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`QuickBooks token refresh failed (${response.status})`);
  }

  const tokenData: IntuitTokenResponse = await response.json();
  await supabaseClient
    .from("quickbooks_credentials")
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      access_token_expires_at: new Date(now.getTime() + tokenData.expires_in * 1000).toISOString(),
      refresh_token_expires_at: new Date(now.getTime() + tokenData.x_refresh_token_expires_in * 1000).toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", credential.id);

  return tokenData.access_token;
}

async function fetchInvoice(
  accessToken: string,
  realmId: string,
  invoiceId: string,
): Promise<{ invoice: QuickBooksInvoice; intuitTid: string | null }> {
  const response = await fetch(
    withMinorVersion(`${QBO_API_BASE}/v3/company/${realmId}/invoice/${encodeURIComponent(invoiceId)}`),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );
  const intuitTid = getIntuitTid(response);
  if (!response.ok) {
    throw new Error(
      `QuickBooks invoice read failed (${response.status}) (intuit_tid: ${intuitTid ?? "unknown"})`,
    );
  }
  const body = await response.json();
  if (body.Fault) {
    throw new Error(
      `QuickBooks invoice read Fault: ${JSON.stringify(body.Fault).substring(0, 300)} (intuit_tid: ${intuitTid ?? "unknown"})`,
    );
  }
  if (!body.Invoice?.Id) {
    throw new Error(
      `QuickBooks invoice read returned no Invoice.Id (intuit_tid: ${intuitTid ?? "unknown"})`,
    );
  }
  return { invoice: body.Invoice as QuickBooksInvoice, intuitTid };
}

/** Stable key for a credential entry so the same realm under two orgs never collides. */
function credentialKey(organizationId: string, realmId: string): string {
  return `${organizationId}::${realmId}`;
}

async function loadCredentialsByOrgRealm(
  supabaseClient: any,
  pairs: Array<{ organizationId: string; realmId: string }>,
): Promise<Map<string, QuickBooksCredential>> {
  if (pairs.length === 0) return new Map<string, QuickBooksCredential>();
  const realmIds = Array.from(new Set(pairs.map((p) => p.realmId)));
  const orgIds = Array.from(new Set(pairs.map((p) => p.organizationId)));
  const { data, error } = await supabaseClient
    .from("quickbooks_credentials")
    .select("*")
    .in("realm_id", realmIds)
    .in("organization_id", orgIds);
  if (error) throw error;
  const byKey = new Map<string, QuickBooksCredential>();
  for (const credential of data ?? []) {
    byKey.set(
      credentialKey(credential.organization_id, credential.realm_id),
      credential as QuickBooksCredential,
    );
  }
  return byKey;
}

async function markEvent(
  supabaseClient: any,
  eventId: string,
  status: "processed" | "error",
  lastError?: string,
): Promise<void> {
  await supabaseClient
    .from("quickbooks_invoice_status_events")
    .update({
      status,
      processed_at: status === "processed" ? new Date().toISOString() : null,
      last_error: lastError ? lastError.substring(0, 1000) : null,
    })
    .eq("id", eventId);
}

async function processInvoiceEvents(
  supabaseClient: any,
  clientId: string,
  clientSecret: string,
): Promise<{ processed: number; failed: number }> {
  const { data: events, error } = await supabaseClient
    .from("quickbooks_invoice_status_events")
    .select("id, organization_id, realm_id, entity_name, entity_id, operation, attempts")
    .in("status", ["pending", "error"])
    .lt("attempts", 5)
    .order("created_at", { ascending: true })
    .limit(EVENT_BATCH_SIZE);

  if (error) throw error;
  const typedEvents = (events ?? []) as InvoiceEvent[];
  const credentialsByKey = await loadCredentialsByOrgRealm(
    supabaseClient,
    typedEvents.map((event) => ({ organizationId: event.organization_id, realmId: event.realm_id })),
  );

  let processed = 0;
  let failed = 0;

  for (const event of typedEvents) {
    try {
      await supabaseClient
        .from("quickbooks_invoice_status_events")
        .update({ status: "processing", attempts: event.attempts + 1 })
        .eq("id", event.id);

      const credential = credentialsByKey.get(credentialKey(event.organization_id, event.realm_id));
      if (!credential) throw new Error("No QuickBooks credentials for event realm and organization");

      const accessToken = await refreshTokenIfNeeded(credential, supabaseClient, clientId, clientSecret);

      if (event.entity_name === "Invoice") {
        const { invoice, intuitTid } = await fetchInvoice(accessToken, event.realm_id, event.entity_id);
        logStep("Invoice fetched", { entity_id: event.entity_id, intuit_tid: intuitTid });
        await updateMirroredWorkOrders(supabaseClient, {
          organizationId: event.organization_id,
          realmId: event.realm_id,
          invoice,
          operation: event.operation,
        });
      } else if (event.entity_name === "Payment") {
        const { payment, intuitTid: paymentIntuitTid } = await fetchPayment(
          accessToken,
          event.realm_id,
          event.entity_id,
        );
        logStep("Payment fetched", { entity_id: event.entity_id, payment_intuit_tid: paymentIntuitTid });
        const invoiceIds = extractLinkedInvoiceIdsFromPayment(payment);
        if (invoiceIds.length === 0) {
          throw new Error("QuickBooks Payment event did not reference any Invoice transactions");
        }
        for (const invoiceId of invoiceIds) {
          const { invoice, intuitTid } = await fetchInvoice(accessToken, event.realm_id, invoiceId);
          logStep("Payment-linked invoice fetched", { invoice_id: invoiceId, intuit_tid: intuitTid });
          await updateMirroredWorkOrders(supabaseClient, {
            organizationId: event.organization_id,
            realmId: event.realm_id,
            invoice,
          });
        }
      } else {
        throw new Error(`Unsupported QuickBooks event entity_name: ${(event as InvoiceEvent).entity_name}`);
      }

      await markEvent(supabaseClient, event.id, "processed");
      processed += 1;
    } catch (eventError) {
      failed += 1;
      await markEvent(
        supabaseClient,
        event.id,
        "error",
        eventError instanceof Error ? eventError.message : String(eventError),
      );
    }
  }

  return { processed, failed };
}

async function reconcileOpenInvoices(
  supabaseClient: any,
  clientId: string,
  clientSecret: string,
): Promise<{ reconciled: number; failed: number }> {
  const { data: rows, error } = await supabaseClient
    .from("work_orders")
    .select("id, organization_id, quickbooks_realm_id, quickbooks_invoice_id")
    .not("quickbooks_invoice_id", "is", null)
    .not("quickbooks_realm_id", "is", null)
    .or("invoice_status.is.null,invoice_status.in.(draft,sent,viewed,partially_paid,overdue)")
    .order("invoice_last_synced_at", { ascending: true, nullsFirst: true })
    .limit(RECONCILE_BATCH_SIZE);

  if (error) throw error;
  const candidates = rows ?? [];
  const credentialsByKey = await loadCredentialsByOrgRealm(
    supabaseClient,
    candidates
      .filter((row) => row.organization_id && row.quickbooks_realm_id)
      .map((row) => ({ organizationId: row.organization_id, realmId: row.quickbooks_realm_id })),
  );

  let reconciled = 0;
  let failed = 0;

  for (const row of candidates) {
    try {
      const credential = credentialsByKey.get(credentialKey(row.organization_id, row.quickbooks_realm_id));
      if (!credential) throw new Error("No QuickBooks credentials for invoice realm and organization");
      const accessToken = await refreshTokenIfNeeded(credential, supabaseClient, clientId, clientSecret);
      const { invoice, intuitTid } = await fetchInvoice(
        accessToken,
        row.quickbooks_realm_id,
        row.quickbooks_invoice_id,
      );
      logStep("Reconcile invoice fetched", {
        invoice_id: row.quickbooks_invoice_id,
        intuit_tid: intuitTid,
      });
      await updateMirroredWorkOrders(supabaseClient, {
        organizationId: row.organization_id,
        realmId: row.quickbooks_realm_id,
        invoice,
        operation: "Reconcile",
      });
      reconciled += 1;
    } catch (syncError) {
      failed += 1;
      await supabaseClient
        .from("work_orders")
        .update({
          invoice_sync_error: (syncError instanceof Error ? syncError.message : String(syncError)).substring(0, 1000),
          invoice_last_synced_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .eq("organization_id", row.organization_id);
    }
  }

  return { reconciled, failed };
}

Deno.serve(withCorrelationId(async (req, ctx) => {
  const corsResponse = handleCorsPreflightIfNeeded(req, { useValidatedOrigin: true });
  if (corsResponse) return corsResponse;

  try {
    const clientId = requireSecret("INTUIT_CLIENT_ID", { functionName: FUNCTION_NAME });
    const clientSecret = requireSecret("INTUIT_CLIENT_SECRET", { functionName: FUNCTION_NAME });
    const supabaseUrl = requireSecret("SUPABASE_URL", { functionName: FUNCTION_NAME });
    const serviceRoleKey = requireSecret("SUPABASE_SERVICE_ROLE_KEY", { functionName: FUNCTION_NAME });

    if (!validateServiceRoleAuth(req, serviceRoleKey)) {
      return createErrorResponse("Unauthorized", 401, { req });
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const eventResult = await processInvoiceEvents(supabaseClient, clientId, clientSecret);
    const reconcileResult = await reconcileOpenInvoices(supabaseClient, clientId, clientSecret);

    logStep("Sync completed", {
      ...eventResult,
      ...reconcileResult,
      correlation_id: ctx.correlationId,
    });

    return createJsonResponse({
      success: true,
      events_processed: eventResult.processed,
      events_failed: eventResult.failed,
      invoices_reconciled: reconcileResult.reconciled,
      invoices_failed: reconcileResult.failed,
    }, 200, { req });
  } catch (error) {
    if (error instanceof MissingSecretError) {
      return createErrorResponse(error, 500, { req });
    }
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message, correlation_id: ctx.correlationId });
    return createErrorResponse("An internal error occurred", 500, { req });
  }
}));

export const __syncTestables = {
  deriveQuickBooksInvoiceStatus,
  validateServiceRoleAuth,
  updateMirroredWorkOrders,
};
