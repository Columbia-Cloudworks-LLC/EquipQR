/**
 * Owner-granted EquipQR Support access (issue #1648 review).
 *
 * Auth (verify_jwt = true):
 *   1. createUserSupabaseClient(req) + requireUser(req, supabase)
 *   2. the caller must be the organization's active owner (checked with the
 *      caller's own RLS-scoped client)
 *   3. DFY_OPERATOR_USER_IDS must be non-empty (otherwise 503: nobody to grant)
 *   4. only then createAdminSupabaseClient() to call grant_support_access,
 *      which re-checks ownership under the organization row lock
 *
 * Operators are emailed after the grant; a failed email never undoes it.
 * Revoking needs no operator list and is a direct RPC (revoke_support_access).
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@4.4.3";
import {
  createAdminSupabaseClient,
  createErrorResponse,
  createJsonResponse,
  createUserSupabaseClient,
  handleCorsPreflightIfNeeded,
  requireUser,
  type AuthError,
  type AuthResult,
} from "../_shared/supabase-clients.ts";
import { parseRequestJson } from "../_shared/org-scoped-queries.ts";
import { getOperatorUserIds } from "../_shared/dfy-operator.ts";
import { optionalSecret } from "../_shared/require-secret.ts";
import { sendResendEmail } from "../_shared/resend-send-email.ts";
import { resolvePublicSiteUrl } from "../_shared/public-site-url.ts";
import { createStructuredLogger } from "../_shared/structured-logger.ts";

const FUNCTION_NAME = "support-access";
const logStep = createStructuredLogger(FUNCTION_NAME);

const requestSchema = z.object({
  organizationId: z.string().uuid(),
  durationHours: z.union([z.literal(24), z.literal(72), z.literal(168)]).default(72),
  source: z.enum(["settings", "bug_report"]).default("settings"),
  ticketRef: z.string().trim().max(100).optional(),
});

const grantResultSchema = z.object({
  grant_id: z.string(),
  expires_at: z.string(),
  extended: z.boolean(),
});

const escapeHtml = (unsafe: string): string =>
  unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

/** The operations this function needs (adapter keeps tests cast-free). */
export interface SupportAccessBackend {
  isActiveOwner(organizationId: string, userId: string): Promise<boolean>;
  reconcileOperators?(operatorIds: string[]): Promise<void>;
  grant(args: {
    organizationId: string;
    grantedBy: string;
    operatorIds: string[];
    durationHours: number;
    source: string;
    ticketRef: string | null;
  }): Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
  organizationName(organizationId: string): Promise<string>;
  operatorEmails(operatorIds: string[]): Promise<string[]>;
  sendEmail(to: string[], subject: string, html: string): Promise<boolean>;
}

function liveBackend(req: Request): SupportAccessBackend {
  const userClient: SupabaseClient = createUserSupabaseClient(req);
  let admin: SupabaseClient | null = null;
  const adminClient = () => (admin ??= createAdminSupabaseClient());

  return {
    isActiveOwner: async (organizationId, userId) => {
      const { data, error } = await userClient
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      return !error && data?.role === "owner";
    },
    reconcileOperators: async (operatorIds) => {
      await adminClient().rpc("reconcile_support_operators", {
        p_operator_ids: operatorIds,
      });
    },
    grant: async (args) => {
      const { data, error } = await adminClient().rpc("grant_support_access", {
        p_organization_id: args.organizationId,
        p_granted_by: args.grantedBy,
        p_operator_ids: args.operatorIds,
        p_duration_hours: args.durationHours,
        p_source: args.source,
        p_ticket_ref: args.ticketRef,
      });
      return { data, error };
    },
    organizationName: async (organizationId) => {
      const { data } = await adminClient().from("organizations").select("name").eq("id", organizationId).maybeSingle();
      return data?.name ?? "an organization";
    },
    operatorEmails: async (operatorIds) => {
      const emails: string[] = [];
      for (const id of operatorIds) {
        const { data } = await adminClient().auth.admin.getUserById(id);
        if (data.user?.email) emails.push(data.user.email);
      }
      return emails;
    },
    sendEmail: async (to, subject, html) => {
      const apiKey = optionalSecret("RESEND_API_KEY");
      if (!apiKey) return false;
      const result = await sendResendEmail({
        apiKey,
        from: "EquipQR™ <notifications@equipqr.app>",
        to,
        subject,
        html,
      });
      return !result.error;
    },
  };
}

export interface HandlerDeps {
  authenticate: (req: Request) => Promise<AuthResult | AuthError>;
  backend: (req: Request) => SupportAccessBackend;
  operatorIds: () => string[];
}

const defaultDeps: HandlerDeps = {
  authenticate: (req) => requireUser(req, createUserSupabaseClient(req)),
  backend: liveBackend,
  operatorIds: getOperatorUserIds,
};

export async function handleSupportAccess(
  req: Request,
  correlationId: string,
  deps: HandlerDeps = defaultDeps,
): Promise<Response> {
  const corsResponse = handleCorsPreflightIfNeeded(req, { useValidatedOrigin: true });
  if (corsResponse) return corsResponse;
  const opts = { req };

  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed", 405, opts);
  }

  const auth = await deps.authenticate(req);
  if ("error" in auth) {
    return createErrorResponse(auth.error, auth.status, opts);
  }
  const { user } = auth;

  const parsed = await parseRequestJson(req, requestSchema);
  if (!parsed.success) {
    return createErrorResponse(parsed.error, parsed.status, opts);
  }
  const body = parsed.data;

  const backend = deps.backend(req);
  if (!(await backend.isActiveOwner(body.organizationId, user.id))) {
    logStep("Not the owner", correlationId, { userId: user.id, orgId: body.organizationId });
    return createErrorResponse("Only organization owners can grant support access", 403, opts);
  }

  const operatorIds = deps.operatorIds();
  if (operatorIds.length === 0) {
    logStep("Operator allowlist empty", correlationId, { orgId: body.organizationId });
    try {
      await backend.reconcileOperators?.([]);
    } catch {
      // Best-effort cleanup when the allowlist is empty.
    }
    return createJsonResponse(
      { error: "SUPPORT_UNAVAILABLE", message: "Support access isn't available right now. Please contact EquipQR Support." },
      503,
      opts,
    );
  }

  const { data, error } = await backend.grant({
    organizationId: body.organizationId,
    grantedBy: user.id,
    operatorIds,
    durationHours: body.durationHours,
    source: body.source,
    ticketRef: body.ticketRef ?? null,
  });
  if (error) {
    console.error(`[${FUNCTION_NAME}] grant failed`, { code: error.code });
    if (error.code === "42501") {
      return createErrorResponse("Only organization owners can grant support access", 403, opts);
    }
    if (error.code === "22023") {
      return createErrorResponse(
        "Support access cannot be granted because a configured support operator has a conflicting membership",
        409,
        opts,
      );
    }
    return createErrorResponse("Failed to update support access", 500, opts);
  }
  const grant = grantResultSchema.safeParse(data);
  if (!grant.success) {
    return createErrorResponse("Failed to update support access", 500, opts);
  }

  logStep("Support access granted", correlationId, {
    userId: user.id,
    orgId: body.organizationId,
    hours: body.durationHours,
    extended: grant.data.extended,
    source: body.source,
  });

  let emailed = false;
  try {
    const [orgName, emails] = await Promise.all([
      backend.organizationName(body.organizationId),
      backend.operatorEmails(operatorIds),
    ]);
    if (emails.length > 0) {
      const expires = new Date(grant.data.expires_at).toUTCString();
      const ticket = body.ticketRef ? `<p>Related report: ${escapeHtml(body.ticketRef)}</p>` : "";
      emailed = await backend.sendEmail(
        emails,
        `Support access ${grant.data.extended ? "extended" : "granted"}: ${orgName}`,
        `<p>The owner of <strong>${escapeHtml(orgName)}</strong> ${grant.data.extended ? "extended" : "granted"} EquipQR Support admin access until <strong>${escapeHtml(expires)}</strong>.</p>` +
          ticket +
          `<p><a href="${escapeHtml(resolvePublicSiteUrl())}/dashboard">Open EquipQR</a> and switch to this organization.</p>`,
      );
    }
  } catch (emailError) {
    console.error(`[${FUNCTION_NAME}] operator email failed`, {
      message: emailError instanceof Error ? emailError.name : "unknown",
    });
  }

  return createJsonResponse(
    { expiresAt: grant.data.expires_at, extended: grant.data.extended, operatorsNotified: emailed },
    200,
    opts,
  );
}
