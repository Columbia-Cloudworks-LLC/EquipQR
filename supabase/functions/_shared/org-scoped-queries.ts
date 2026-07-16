/**
 * Org-scoped query helpers and common request validation schemas for Edge Functions.
 *
 * Composes with `createUserSupabaseClient`, `requireUser`, and the existing
 * `verifyOrgMembership` / `verifyOrgAdmin` helpers in `supabase-clients.ts`.
 * All helpers assume a user-scoped Supabase client so RLS remains enforced.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@4.4.3";

const MEMBERSHIP_QUERY_FAILED = "An unexpected error occurred" as const;

// =============================================================================
// Common validation schemas
// =============================================================================

const ORGANIZATION_ID_UUID_PATTERN =
  /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$/;

/** Canonical organization UUID used across org-scoped edge functions. */
export const organizationIdSchema = z.unknown().transform((val, ctx): string => {
  if (val === undefined || val === null) {
    ctx.addIssue({ code: "custom", message: "organizationId is required" });
    return z.NEVER;
  }
  if (typeof val !== "string") {
    ctx.addIssue({ code: "custom", message: "Invalid organizationId" });
    return z.NEVER;
  }
  if (!ORGANIZATION_ID_UUID_PATTERN.test(val)) {
    ctx.addIssue({ code: "custom", message: "Invalid organizationId" });
    return z.NEVER;
  }
  return val;
});

/** Optional org context (e.g. current org hint on inventory scan). */
export const optionalOrganizationIdSchema = organizationIdSchema.optional();

/** Supported CSV export report types (matches export-report). */
export const reportTypeSchema = z.enum([
  "equipment",
  "work-orders",
  "inventory",
  "scans",
  "operator-check-ins",
  "quick-forms",
  "alternate-groups",
]);

/** Shared export filters shape for report endpoints. */
export const exportFiltersSchema = z.object({
  status: z.string().optional(),
  teamId: z.string().uuid().optional(),
  location: z.string().optional(),
  priority: z.string().optional(),
  dateRange: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }).optional(),
}).optional().default({});

/** export-report request body. */
export const exportReportRequestSchema = z.object({
  reportType: reportTypeSchema,
  organizationId: organizationIdSchema,
  filters: exportFiltersSchema,
  columns: z.array(z.string().min(1)).min(1),
  format: z.literal("csv"),
  /** When true, enqueue async job for equipment/work-orders (#1193). */
  async: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(500).optional(),
  offset: z.number().int().min(0).optional(),
});

/** geocode-location request body. */
export const geocodeLocationRequestSchema = z.object({
  organizationId: organizationIdSchema,
  input: z.string().min(1).max(500),
});

/** get/set Google export destination shared fields. */
export const googleExportDestinationDocumentTypeSchema = z.enum([
  "work-orders-internal-packet",
]).optional().default("work-orders-internal-packet");

export const getGoogleExportDestinationRequestSchema = z.object({
  organizationId: organizationIdSchema,
  documentType: googleExportDestinationDocumentTypeSchema,
});

export const googleDriveSelectionKindSchema = z.enum(["folder", "shared_drive"]);

export const setGoogleExportDestinationRequestSchema = z.object({
  organizationId: organizationIdSchema,
  documentType: googleExportDestinationDocumentTypeSchema,
  selectionKind: googleDriveSelectionKindSchema,
  parentId: z.string().min(1),
  folderByTeam: z.boolean().optional(),
  folderByEquipment: z.boolean().optional(),
});

/** resolve-inventory-scan request body. */
export const resolveInventoryScanRequestSchema = z.object({
  scanned_value: z.string().min(1).max(500),
  current_organization_id: optionalOrganizationIdSchema,
});

/** manage-google-drive-destination-folder request body (partial — action-specific fields validated in handler). */
export const manageGoogleDriveFolderRequestSchema = z.object({
  action: z.enum(["create", "delete"]),
  organizationId: organizationIdSchema,
  parentId: z.string().nullable().optional(),
  driveId: z.string().nullable().optional(),
  name: z.string().optional(),
  folderId: z.string().optional(),
  confirmDataLoss: z.boolean().optional(),
});

// =============================================================================
// Body parsing
// =============================================================================

export type ParseBodyResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status: 400 };

/**
 * Parse and validate a JSON request body with a Zod schema.
 * Returns a safe, user-facing error string on validation failure.
 */
export function parseJsonBody<T>(
  schema: z.ZodType<T>,
  rawBody: unknown,
): ParseBodyResult<T> {
  const result = schema.safeParse(rawBody);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const issues = result.error.issues.map((issue) => formatValidationIssue(issue));

  if (
    issues.length === 1 &&
    isOrganizationIdField(result.error.issues[0]?.path[0])
  ) {
    return {
      success: false,
      error: issues[0]!,
      status: 400,
    };
  }

  return {
    success: false,
    error: `Invalid request body: ${issues.join("; ")}`,
    status: 400,
  };
}

function isOrganizationIdField(field: unknown): field is "organizationId" | "current_organization_id" {
  return field === "organizationId" || field === "current_organization_id";
}

function formatValidationIssue(issue: z.ZodIssue): string {
  const field = issue.path.length > 0 ? issue.path.join(".") : "";
  if (isOrganizationIdField(field)) {
    if (issue.message === "organizationId is required" || issue.message === "Invalid organizationId") {
      return issue.message;
    }
    return "Invalid organizationId";
  }

  const path = field ? `${field}: ` : "";
  return `${path}${issue.message}`;
}

/**
 * Parse JSON from the request body, then validate with a Zod schema.
 * Returns 400 for malformed JSON or validation failures.
 */
export async function parseRequestJson<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<ParseBodyResult<T>> {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return { success: false, error: "Invalid JSON body", status: 400 };
  }

  return parseJsonBody(schema, rawBody);
}

// =============================================================================
// Org access helpers
// =============================================================================

export interface OrgMembershipContext {
  organizationId: string;
  role?: string;
}

export interface OrgAccessError {
  error: string;
  status: number;
}

export type OrgMembershipResult = OrgMembershipContext | OrgAccessError;

export type OrgAdminResult = { ok: true } | OrgAccessError;

function isOrgAccessError(
  value: OrgMembershipResult | OrgAdminResult,
): value is OrgAccessError {
  return "error" in value && "status" in value;
}

/**
 * Verify active org membership. Defense-in-depth alongside RLS.
 *
 * @example
 * const access = await requireOrgMembership(supabase, user.id, organizationId);
 * if ("error" in access) {
 *   return createErrorResponse(access.error, access.status);
 * }
 * const { organizationId, role } = access;
 */
export async function requireOrgMembership(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
): Promise<OrgMembershipResult> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("[requireOrgMembership] query failed", { code: error.code });
    return { error: MEMBERSHIP_QUERY_FAILED, status: 500 };
  }

  if (!data) {
    return {
      error: "You are not a member of this organization",
      status: 403,
    };
  }

  return { organizationId, role: data.role };
}

/**
 * Verify org owner/admin role. Defense-in-depth alongside RLS.
 */
export async function requireOrgAdminAccess(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
  forbiddenMessage = "Forbidden: Only owners and admins can perform this action",
): Promise<OrgAdminResult> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .in("role", ["owner", "admin"])
    .maybeSingle();

  if (error) {
    console.error("[requireOrgAdminAccess] query failed", { code: error.code });
    return { error: MEMBERSHIP_QUERY_FAILED, status: 500 };
  }

  if (!data) {
    return { error: forbiddenMessage, status: 403 };
  }

  return { ok: true };
}

export type OrgScopeResult<T> =
  | { ok: true; data: T; role?: string }
  | { ok: false; error: string; status: number };

/**
 * Run a callback after verifying org membership.
 * Keeps membership checks and org-scoped business logic in one place.
 *
 * @example
 * const result = await withOrgScope(supabase, user.id, organizationId, async ({ organizationId }) => {
 *   const { data } = await supabase
 *     .from("geocoded_locations")
 *     .select("latitude, longitude")
 *     .eq("organization_id", organizationId)
 *     .maybeSingle();
 *   return data;
 * });
 * if (!result.ok) {
 *   return createErrorResponse(result.error, result.status);
 * }
 */
export async function withOrgScope<T>(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
  fn: (ctx: OrgMembershipContext) => Promise<T>,
): Promise<OrgScopeResult<T>> {
  const access = await requireOrgMembership(supabase, userId, organizationId);
  if (isOrgAccessError(access)) {
    return { ok: false, error: access.error, status: access.status };
  }

  const data = await fn(access);
  return { ok: true, data, role: access.role };
}

export type OrgAdminScopeResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

/**
 * Run a callback after verifying org admin/owner role.
 *
 * @example
 * const result = await withOrgAdminScope(supabase, user.id, organizationId, async () => {
 *   return supabase.from("organization_google_export_destinations").select("*").eq("organization_id", organizationId);
 * });
 */
export async function withOrgAdminScope<T>(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
  fn: () => Promise<T>,
  forbiddenMessage?: string,
): Promise<OrgAdminScopeResult<T>> {
  const access = await requireOrgAdminAccess(
    supabase,
    userId,
    organizationId,
    forbiddenMessage,
  );
  if (isOrgAccessError(access)) {
    return { ok: false, error: access.error, status: access.status };
  }

  const data = await fn();
  return { ok: true, data };
}

/**
 * Apply the standard org column filter to a Supabase query builder.
 * Prefer this over manual `.eq("organization_id", ...)` for consistency.
 *
 * The query builder type is intentionally loose — Supabase generics vary by table.
 */
export function applyOrganizationScope<TQuery extends { eq: (column: string, value: string) => TQuery }>(
  query: TQuery,
  organizationId: string,
): TQuery {
  return query.eq("organization_id", organizationId);
}
