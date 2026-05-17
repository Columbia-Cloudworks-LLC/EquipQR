import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { MissingSecretError, requireSecret } from "../_shared/require-secret.ts";
import {
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
import { verifyIntuitSignature } from "./webhook-helpers.ts";

const FUNCTION_NAME = "quickbooks-webhook-receiver";

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[QUICKBOOKS-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

type IntuitWebhookEntity = {
  name?: string;
  id?: string;
  operation?: string;
  lastUpdated?: string;
};

type IntuitWebhookNotification = {
  realmId?: string;
  dataChangeEvent?: {
    entities?: IntuitWebhookEntity[];
  };
};

type IntuitWebhookPayload = {
  eventNotifications?: IntuitWebhookNotification[];
};

function parseEventTime(value: string | undefined): string {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

/**
 * Build the rows to insert into `quickbooks_invoice_status_events` from a
 * parsed Intuit webhook payload and the set of known credentials.
 *
 * One row is emitted per (organization, entity) pair so that when the same
 * QBO realm is connected to multiple organizations, every tenant receives its
 * own event to process.
 */
export function buildInvoiceStatusEventRows(
  payload: IntuitWebhookPayload,
  credentials: Array<{ organization_id: string; realm_id: string }>,
): Array<Record<string, unknown>> {
  const orgsByRealm = new Map<string, string[]>();
  for (const credential of credentials) {
    const existing = orgsByRealm.get(credential.realm_id) ?? [];
    existing.push(credential.organization_id);
    orgsByRealm.set(credential.realm_id, existing);
  }

  const rows: Array<Record<string, unknown>> = [];
  for (const notification of payload.eventNotifications ?? []) {
    const realmId = notification.realmId;
    const organizationIds = realmId ? (orgsByRealm.get(realmId) ?? []) : [];
    if (!realmId || organizationIds.length === 0) continue;

    for (const entity of notification.dataChangeEvent?.entities ?? []) {
      if (!entity.id || !entity.name || !["Invoice", "Payment"].includes(entity.name)) {
        continue;
      }
      for (const organizationId of organizationIds) {
        rows.push({
          organization_id: organizationId,
          realm_id: realmId,
          entity_name: entity.name,
          entity_id: entity.id,
          operation: entity.operation ?? "Update",
          event_time: parseEventTime(entity.lastUpdated),
          raw_event: { realmId, entity },
        });
      }
    }
  }
  return rows;
}

Deno.serve(withCorrelationId(async (req, ctx) => {
  const corsResponse = handleCorsPreflightIfNeeded(req, { useValidatedOrigin: true });
  if (corsResponse) return corsResponse;

  try {
    const verifierToken = requireSecret("QBO_WEBHOOK_VERIFIER_TOKEN", { functionName: FUNCTION_NAME });
    const supabaseUrl = requireSecret("SUPABASE_URL", { functionName: FUNCTION_NAME });
    const serviceRoleKey = requireSecret("SUPABASE_SERVICE_ROLE_KEY", { functionName: FUNCTION_NAME });

    const rawBody = await req.text();
    const isValid = await verifyIntuitSignature(
      rawBody,
      req.headers.get("intuit-signature"),
      verifierToken,
    );

    if (!isValid) {
      logStep("Invalid webhook signature", { correlation_id: ctx.correlationId });
      return createErrorResponse("Unauthorized", 401, { req });
    }

    let payload: IntuitWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as IntuitWebhookPayload;
    } catch {
      return createErrorResponse("Invalid JSON body", 400, { req });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const realmIds = Array.from(
      new Set((payload.eventNotifications ?? []).map((n) => n.realmId).filter(Boolean) as string[]),
    );

    if (realmIds.length === 0) {
      return createJsonResponse({ success: true, inserted: 0 }, 200, { req });
    }

    const { data: credentials, error: credentialError } = await adminClient
      .from("quickbooks_credentials")
      .select("organization_id, realm_id")
      .in("realm_id", realmIds);

    if (credentialError) throw credentialError;

    const rows = buildInvoiceStatusEventRows(payload, credentials ?? []);

    if (rows.length > 0) {
      const { error } = await adminClient.from("quickbooks_invoice_status_events").insert(rows);
      if (error) throw error;
    }

    logStep("Webhook accepted", { inserted: rows.length, correlation_id: ctx.correlationId });
    return createJsonResponse({ success: true, inserted: rows.length }, 200, { req });
  } catch (error) {
    if (error instanceof MissingSecretError) {
      return createErrorResponse(error, 500, { req });
    }
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message, correlation_id: ctx.correlationId });
    return createErrorResponse("An internal error occurred", 500, { req });
  }
}));

export const __webhookTestables = {
  verifyIntuitSignature,
  buildInvoiceStatusEventRows,
};
