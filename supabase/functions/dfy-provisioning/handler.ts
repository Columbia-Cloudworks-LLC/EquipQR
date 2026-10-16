/**
 * Done-For-You provisioning for EquipQR operators (issue #1648 review).
 *
 * Auth (verify_jwt = true):
 *   1. createUserSupabaseClient(req) + requireUser(req, supabase)
 *   2. the caller's user ID must be in DFY_OPERATOR_USER_IDS and their email
 *      must be confirmed (missing/empty allowlist → nobody)
 *   3. only then createAdminSupabaseClient() for the provisioning RPCs
 *
 * Operators reach an organization only while nobody has claimed it; the SQL
 * functions enforce that under the organization row lock.
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
import { isDfyOperator } from "../_shared/dfy-operator.ts";
import { resolvePublicSiteUrl } from "../_shared/public-site-url.ts";
import { createStructuredLogger } from "../_shared/structured-logger.ts";

const FUNCTION_NAME = "dfy-provisioning";
const logStep = createStructuredLogger(FUNCTION_NAME);

const MAX_STAFF = 500;
const MAX_EQUIPMENT = 5000;

const uuid = z.string().uuid();
const email = z.string().trim().toLowerCase().email().max(320);
const orgRole = z.enum(["owner", "admin", "member"]);
const teamRole = z.enum(["manager", "technician", "requestor", "viewer"]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const staffSchema = z.object({
  email,
  role: orgRole,
  teamRole: teamRole.nullish(),
});

const equipmentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  manufacturer: z.string().trim().max(200).optional(),
  model: z.string().trim().max(200).optional(),
  serialNumber: z.string().trim().max(200).optional(),
  location: z.string().trim().max(500).optional(),
  installationDate: isoDate.optional(),
  status: z.enum(["active", "maintenance", "inactive"]).optional(),
  notes: z.string().trim().max(5000).optional(),
  importId: z.string().trim().max(200).optional(),
});

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("whoami") }),
  z.object({ action: z.literal("list") }),
  z.object({ action: z.literal("get"), organizationId: uuid }),
  z.object({
    action: z.literal("check_existing"),
    emails: z.array(email).min(1).max(MAX_STAFF),
  }),
  z.object({
    action: z.literal("create"),
    requestId: uuid,
    name: z.string().trim().min(1).max(200),
    teamName: z.string().trim().max(200).optional(),
    staff: z.array(staffSchema).min(1).max(MAX_STAFF),
    equipment: z.array(equipmentSchema).max(MAX_EQUIPMENT).default([]),
    attachExistingEmails: z.array(email).max(MAX_STAFF).default([]),
  }),
  z.object({
    action: z.literal("stage"),
    organizationId: uuid,
    email,
    role: orgRole,
    teamRole: teamRole.nullish(),
    attachExisting: z.boolean().default(false),
  }),
  z.object({ action: z.literal("revoke_staff"), stagedMemberId: uuid }),
  z.object({
    action: z.literal("add_equipment"),
    organizationId: uuid,
    equipment: z.array(equipmentSchema).min(1).max(MAX_EQUIPMENT),
  }),
  z.object({ action: z.literal("delete_equipment"), organizationId: uuid, equipmentId: uuid }),
  z.object({ action: z.literal("send_invites"), organizationId: uuid }),
]);

type EquipmentInput = z.infer<typeof equipmentSchema>;

function toEquipmentRows(rows: EquipmentInput[]) {
  return rows.map((row) => ({
    name: row.name,
    manufacturer: row.manufacturer ?? "",
    model: row.model ?? "",
    serial_number: row.serialNumber ?? "",
    location: row.location ?? "",
    installation_date: row.installationDate ?? null,
    status: row.status ?? "active",
    notes: row.notes ?? null,
    import_id: row.importId ?? null,
  }));
}

interface RpcError {
  code?: string;
  message: string;
  details?: string | null;
}

/** Map SQL errors raised by the provisioning functions to operator-facing codes. */
function rpcErrorResponse(error: RpcError, req: Request): Response {
  const opts = { req };
  if (error.message === "ORG_NOT_EDITABLE") {
    return createJsonResponse(
      { error: "ORG_NOT_EDITABLE", message: "Someone has already joined this organization. Operators can no longer change it." },
      409,
      opts,
    );
  }
  if (error.message === "EXISTING_ACCOUNT") {
    return createJsonResponse(
      { error: "EXISTING_ACCOUNT", message: error.details ?? "An email already has a verified account." },
      409,
      opts,
    );
  }
  if (error.code === "23505" && error.message.includes("idx_org_provisioned_members_live_owner")) {
    return createJsonResponse(
      { error: "OWNER_EXISTS", message: "This yard already has an owner staged. Remove that owner first, then add the new one." },
      409,
      opts,
    );
  }
  if (error.code === "23505") {
    return createJsonResponse(
      { error: "DUPLICATE", message: "That email is already staged for this organization." },
      409,
      opts,
    );
  }
  if (error.code === "22023" || error.code === "23514" || error.code === "22P02") {
    return createJsonResponse({ error: "INVALID_INPUT", message: error.message }, 400, opts);
  }
  console.error(`[${FUNCTION_NAME}] rpc failed`, { code: error.code });
  return createErrorResponse("Failed to update provisioning", 500, opts);
}

/** The service-role operations this function needs (adapter keeps tests cast-free). */
export interface ProvisioningBackend {
  rpc(fn: string, args?: Record<string, unknown>): Promise<{ data: unknown; error: RpcError | null }>;
  firstTeamId(organizationId: string): Promise<{ id: string | null; error: RpcError | null }>;
  invite(email: string, redirectTo: string): Promise<boolean>;
}

function adminBackend(client: SupabaseClient): ProvisioningBackend {
  return {
    rpc: async (fn, args) => {
      const { data, error } = await client.rpc(fn, args);
      return { data, error };
    },
    firstTeamId: async (organizationId) => {
      const { data, error } = await client
        .from("teams")
        .select("id")
        .eq("organization_id", organizationId)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      return { id: data?.id ?? null, error };
    },
    invite: async (email, redirectTo) => {
      const { error } = await client.auth.admin.inviteUserByEmail(email, { redirectTo });
      return !error;
    },
  };
}

export interface HandlerDeps {
  authenticate: (req: Request) => Promise<AuthResult | AuthError>;
  createBackend: () => ProvisioningBackend;
  isOperator: typeof isDfyOperator;
}

const defaultDeps: HandlerDeps = {
  authenticate: (req) => requireUser(req, createUserSupabaseClient(req)),
  createBackend: () => adminBackend(createAdminSupabaseClient()),
  isOperator: isDfyOperator,
};

export async function handleDfyProvisioning(
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

  const operator = deps.isOperator(user);
  if (body.action === "whoami") {
    return createJsonResponse({ isOperator: operator }, 200, opts);
  }
  if (!operator) {
    logStep("Operator access denied", correlationId, { userId: user.id, action: body.action });
    return createErrorResponse("Forbidden", 403, opts);
  }

  // Authorized operator: service role from here on.
  const admin = deps.createBackend();
  logStep("Operator action", correlationId, { userId: user.id, action: body.action });

  switch (body.action) {
    case "list": {
      const { data, error } = await admin.rpc("operator_list_unclaimed_organizations");
      if (error) return rpcErrorResponse(error, req);
      return createJsonResponse({ organizations: data ?? [] }, 200, opts);
    }
    case "get": {
      const { data, error } = await admin.rpc("operator_get_organization", {
        p_organization_id: body.organizationId,
      });
      if (error) return rpcErrorResponse(error, req);
      return createJsonResponse(data, 200, opts);
    }
    case "check_existing": {
      const { data, error } = await admin.rpc("operator_verified_account_emails", {
        p_emails: body.emails,
      });
      if (error) return rpcErrorResponse(error, req);
      return createJsonResponse({ existing: data ?? [] }, 200, opts);
    }
    case "create": {
      const { data, error } = await admin.rpc("provision_organization", {
        p_request_id: body.requestId,
        p_operator_id: user.id,
        p_name: body.name,
        p_team_name: body.teamName ?? "",
        p_staff: body.staff.map((s) => ({ email: s.email, role: s.role, team_role: s.teamRole ?? null })),
        p_equipment: toEquipmentRows(body.equipment),
        p_attach_existing_emails: body.attachExistingEmails,
      });
      if (error) return rpcErrorResponse(error, req);
      return createJsonResponse(data, 200, opts);
    }
    case "stage": {
      const team = await admin.firstTeamId(body.organizationId);
      if (team.error) return rpcErrorResponse(team.error, req);
      const { data, error } = await admin.rpc("operator_stage_member", {
        p_operator_id: user.id,
        p_organization_id: body.organizationId,
        p_email: body.email,
        p_role: body.role,
        p_team_id: body.teamRole ? team.id : null,
        p_team_role: body.teamRole ?? null,
        p_attach_existing: body.attachExisting,
      });
      if (error) return rpcErrorResponse(error, req);
      return createJsonResponse({ stagedMemberId: data }, 200, opts);
    }
    case "revoke_staff": {
      const { error } = await admin.rpc("operator_revoke_staged_member", {
        p_operator_id: user.id,
        p_staged_member_id: body.stagedMemberId,
      });
      if (error) return rpcErrorResponse(error, req);
      return createJsonResponse({ ok: true }, 200, opts);
    }
    case "add_equipment": {
      const { data, error } = await admin.rpc("operator_add_equipment", {
        p_operator_id: user.id,
        p_organization_id: body.organizationId,
        p_equipment: toEquipmentRows(body.equipment),
      });
      if (error) return rpcErrorResponse(error, req);
      return createJsonResponse({ added: data }, 200, opts);
    }
    case "delete_equipment": {
      const { error } = await admin.rpc("operator_delete_equipment", {
        p_operator_id: user.id,
        p_organization_id: body.organizationId,
        p_equipment_id: body.equipmentId,
      });
      if (error) return rpcErrorResponse(error, req);
      return createJsonResponse({ ok: true }, 200, opts);
    }
    case "send_invites": {
      const { data: org, error } = await admin.rpc("operator_get_organization", {
        p_organization_id: body.organizationId,
      });
      if (error) return rpcErrorResponse(error, req);
      const staff = (org as { staff?: Array<{ email: string; status: string }> } | null)?.staff ?? [];
      const redirectTo = resolvePublicSiteUrl();
      const results: Array<{ email: string; sent: boolean }> = [];
      // Invites are irreversible; send one at a time and report each.
      for (const person of staff.filter((s) => s.status === "pending")) {
        results.push({ email: person.email, sent: await admin.invite(person.email, redirectTo) });
      }
      logStep("Invites sent", correlationId, {
        userId: user.id,
        sent: results.filter((r) => r.sent).length,
        failed: results.filter((r) => !r.sent).length,
      });
      return createJsonResponse({ results }, 200, opts);
    }
  }
}

