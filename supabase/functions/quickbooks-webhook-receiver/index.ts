import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { MissingSecretError, requireSecret } from "../_shared/require-secret.ts";
import { withCorrelationId } from "../_shared/supabase-clients.ts";
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

Deno.serve(withCorrelationId(async (req, ctx) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
      return new Response(JSON.stringify({ success: false, error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let payload: IntuitWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as IntuitWebhookPayload;
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const realmIds = Array.from(
      new Set((payload.eventNotifications ?? []).map((n) => n.realmId).filter(Boolean) as string[]),
    );

    if (realmIds.length === 0) {
      return new Response(JSON.stringify({ success: true, inserted: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: credentials, error: credentialError } = await adminClient
      .from("quickbooks_credentials")
      .select("organization_id, realm_id")
      .in("realm_id", realmIds);

    if (credentialError) throw credentialError;

    const orgByRealm = new Map<string, string>();
    for (const credential of credentials ?? []) {
      orgByRealm.set(credential.realm_id, credential.organization_id);
    }

    const rows: Array<Record<string, unknown>> = [];
    for (const notification of payload.eventNotifications ?? []) {
      const realmId = notification.realmId;
      const organizationId = realmId ? orgByRealm.get(realmId) : undefined;
      if (!realmId || !organizationId) continue;

      for (const entity of notification.dataChangeEvent?.entities ?? []) {
        if (!entity.id || !entity.name || !["Invoice", "Payment"].includes(entity.name)) {
          continue;
        }
        rows.push({
          organization_id: organizationId,
          realm_id: realmId,
          entity_name: entity.name,
          entity_id: entity.id,
          operation: entity.operation ?? "Update",
          event_time: parseEventTime(entity.lastUpdated),
          raw_event: {
            realmId,
            entity,
          },
        });
      }
    }

    if (rows.length > 0) {
      const { error } = await adminClient.from("quickbooks_invoice_status_events").insert(rows);
      if (error) throw error;
    }

    logStep("Webhook accepted", { inserted: rows.length, correlation_id: ctx.correlationId });
    return new Response(JSON.stringify({ success: true, inserted: rows.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!(error instanceof MissingSecretError)) {
      logStep("ERROR", { message, correlation_id: ctx.correlationId });
    }
    return new Response(JSON.stringify({ success: false, error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));

export const __webhookTestables = {
  verifyIntuitSignature,
};
