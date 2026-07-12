/**
 * Process Export Job Edge Function (#1193)
 *
 * Invoked by queue-worker for each message on the `exports` pgmq queue.
 * Authorization already happened in enqueue_export_job; this worker uses the
 * service role to fetch org-scoped rows (minimal columns), build CSV, upload
 * to the private export-results bucket, and update export_request_log.
 *
 * Auth: service role only (same contract as queue-worker).
 */

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import {
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
  verifyOrgAdmin,
  withCorrelationId,
} from "../_shared/supabase-clients.ts";
import { requireSecret } from "../_shared/require-secret.ts";
import {
  buildExportStoragePath,
  EXPORT_RESULTS_BUCKET,
  isAsyncExportReportType,
  logExportJobStep,
  parseExportJobMessage,
  type ExportJobMessage,
} from "../_shared/export-job.ts";
import { fetchReportRows } from "../_shared/reports/fetch-rows.ts";
import { buildReportCsv } from "../_shared/reports/format-csv.ts";
import {
  asReportDataClient,
  type FleetReportType,
} from "../_shared/reports/types.ts";

const FUNCTION_NAME = "process-export-job";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

type ExportQueryError = { message: string } | null;

/** Chainable PostgREST-style builder used by the worker (stub-friendly, no `any`). */
export type ExportJobQueryBuilder = {
  select: (columns: string) => ExportJobQueryBuilder;
  eq: (column: string, value: unknown) => ExportJobQueryBuilder;
  in: (column: string, values: unknown[]) => ExportJobQueryBuilder;
  not: (column: string, operator: string, value: unknown) => ExportJobQueryBuilder;
  order: (
    column: string,
    options?: { ascending?: boolean },
  ) => ExportJobQueryBuilder;
  limit: (count: number) => ExportJobQueryBuilder;
  ilike: (column: string, pattern: string) => ExportJobQueryBuilder;
  gte: (column: string, value: unknown) => ExportJobQueryBuilder;
  lte: (column: string, value: unknown) => ExportJobQueryBuilder;
  update: (values: Record<string, unknown>) => ExportJobQueryBuilder;
  insert: (
    values: Record<string, unknown>,
  ) => PromiseLike<{ error: ExportQueryError }>;
  maybeSingle: () => PromiseLike<{
    data: Record<string, unknown> | null;
    error: ExportQueryError;
  }>;
  then: PromiseLike<{
    data: Record<string, unknown>[] | null;
    error: ExportQueryError;
  }>["then"];
};

/** Minimal admin client surface used by the worker (keeps tests stub-friendly). */
export type ExportJobAdminClient = {
  from: (table: string) => ExportJobQueryBuilder;
  rpc?: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        bytes: Uint8Array,
        opts?: { contentType?: string; upsert?: boolean },
      ) => Promise<{ error: { message: string } | null }>;
      createSignedUrl: (
        path: string,
        expiresIn: number,
      ) => Promise<{
        data: { signedUrl: string } | null;
        error: { message: string } | null;
      }>;
    };
  };
};

function asUuidArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value.filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  return ids;
}

/**
 * Resolve work-order team scope for the async worker.
 * Missing/invalid accessibleTeamIds is only allowed for org admins (re-checked via DB).
 */
export async function resolveWorkOrderExportTeamScope(
  adminClient: ExportJobAdminClient,
  userId: string,
  organizationId: string,
  payloadTeamIds: unknown,
): Promise<{ ok: true; teamIds: string[] | null } | { ok: false; error: string }> {
  const parsed = asUuidArray(payloadTeamIds);
  const isAdmin = await verifyOrgAdmin(
    adminClient as unknown as SupabaseClient,
    userId,
    organizationId,
  );

  if (isAdmin) {
    return { ok: true, teamIds: parsed };
  }

  if (!parsed || parsed.length === 0) {
    return {
      ok: false,
      error:
        "Work-order export missing accessibleTeamIds for non-admin job owner",
    };
  }

  return { ok: true, teamIds: parsed };
}

function validateServiceRoleAuth(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== "bearer") {
    return false;
  }
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return expected !== undefined && parts[1] === expected;
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const cols = value.filter((v): v is string => typeof v === "string" && v.length > 0);
  return cols.length > 0 ? cols : fallback;
}

export async function processExportJobPayload(
  adminClient: ExportJobAdminClient,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string; rowCount?: number }> {
  const message = parseExportJobMessage(payload);
  if (!message) {
    return { ok: false, error: "Invalid export job payload" };
  }

  if (!isAsyncExportReportType(message.report_type)) {
    return { ok: false, error: `Unsupported report type: ${message.report_type}` };
  }

  const { data: logRow, error: logError } = await adminClient
    .from("export_request_log")
    .select("id, status, request_payload, organization_id, user_id, report_type")
    .eq("id", message.export_log_id)
    .maybeSingle();

  if (logError || !logRow) {
    return { ok: false, error: logError?.message ?? "Export log not found" };
  }

  // Defense-in-depth: queue message must match the authoritative log row.
  if (
    logRow.organization_id !== message.organization_id ||
    logRow.user_id !== message.user_id ||
    logRow.report_type !== message.report_type
  ) {
    return {
      ok: false,
      error: "Export job message does not match export_request_log row",
    };
  }

  if (logRow.status === "completed") {
    logExportJobStep("already-completed", { export_log_id: message.export_log_id });
    return { ok: true, rowCount: 0 };
  }

  await adminClient
    .from("export_request_log")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", message.export_log_id);

  const requestPayload = (logRow.request_payload ?? {}) as Record<string, unknown>;
  const filters = (requestPayload.filters ?? {}) as Record<string, unknown>;
  const dateRange = (filters.dateRange ?? {}) as { from?: string; to?: string };

  try {
    const result = await runExportAndStore(adminClient, message, requestPayload, filters, dateRange);
    return result;
  } catch (err) {
    const messageText = err instanceof Error ? err.message : String(err);
    await adminClient
      .from("export_request_log")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: messageText,
      })
      .eq("id", message.export_log_id);
    return { ok: false, error: messageText };
  }
}

async function runExportAndStore(
  adminClient: ExportJobAdminClient,
  message: ExportJobMessage,
  requestPayload: Record<string, unknown>,
  filters: Record<string, unknown>,
  dateRange: { from?: string; to?: string },
): Promise<{ ok: boolean; error?: string; rowCount?: number }> {
  const defaultColumns = message.report_type === "equipment"
    ? ["name", "manufacturer", "model", "serial_number", "status", "location", "team_name"]
    : ["title", "status", "priority", "assignee_name", "team_name", "equipment_name", "created_date"];
  const columns = asStringArray(requestPayload.columns, defaultColumns);

  let accessibleTeamIds: string[] | undefined;
  if (message.report_type === "work-orders") {
    const scope = await resolveWorkOrderExportTeamScope(
      adminClient,
      message.user_id,
      message.organization_id,
      requestPayload.accessibleTeamIds,
    );
    if (!scope.ok) {
      throw new Error(scope.error);
    }
    accessibleTeamIds = scope.teamIds ?? undefined;
  }

  const rows = await fetchReportRows(asReportDataClient(adminClient), {
    reportType: message.report_type as FleetReportType,
    organizationId: message.organization_id,
    filters: {
      status: typeof filters.status === "string" ? filters.status : undefined,
      teamId: typeof filters.teamId === "string" ? filters.teamId : undefined,
      location: typeof filters.location === "string" ? filters.location : undefined,
      priority: typeof filters.priority === "string" ? filters.priority : undefined,
      dateRange,
    },
    columns,
    accessibleTeamIds,
  });

  const built = buildReportCsv(message.report_type as FleetReportType, rows, columns);

  const storagePath = buildExportStoragePath(
    message.organization_id,
    message.user_id,
    message.export_log_id,
  );

  const csvBytes = new TextEncoder().encode(built.csvContent);
  const { error: uploadError } = await adminClient.storage
    .from(EXPORT_RESULTS_BUCKET)
    .upload(storagePath, csvBytes, {
      contentType: "text/csv; charset=utf-8",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: signed, error: signedError } = await adminClient.storage
    .from(EXPORT_RESULTS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (signedError) {
    logExportJobStep("signed-url-failed", {
      export_log_id: message.export_log_id,
      error: signedError.message,
    });
  }

  await adminClient
    .from("export_request_log")
    .update({
      status: "completed",
      row_count: built.rowCount,
      completed_at: new Date().toISOString(),
      result_storage_path: storagePath,
      result_url: signed?.signedUrl ?? null,
      error_message: null,
    })
    .eq("id", message.export_log_id);

  try {
    await adminClient.from("notifications").insert({
      organization_id: message.organization_id,
      user_id: message.user_id,
      type: "export_ready",
      title: "Export ready",
      message: `Your ${message.report_type.replace("-", " ")} export is ready to download.`,
      data: {
        export_log_id: message.export_log_id,
        report_type: message.report_type,
        row_count: built.rowCount,
        result_storage_path: storagePath,
      },
      is_global: false,
    });
  } catch (notifyErr) {
    logExportJobStep("notify-failed", {
      export_log_id: message.export_log_id,
      error: notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
    });
  }

  logExportJobStep("completed", {
    export_log_id: message.export_log_id,
    row_count: built.rowCount,
    storage_path: storagePath,
  });

  return { ok: true, rowCount: built.rowCount };
}

if (import.meta.main) {
  Deno.serve(withCorrelationId(async (req, ctx) => {
    const corsResponse = handleCorsPreflightIfNeeded(req);
    if (corsResponse) return corsResponse;

    if (req.method !== "POST") {
      return createErrorResponse("Method not allowed", 405);
    }

    const supabaseUrl = requireSecret("SUPABASE_URL", { functionName: FUNCTION_NAME });
    const serviceRoleKey = requireSecret("SUPABASE_SERVICE_ROLE_KEY", {
      functionName: FUNCTION_NAME,
    });

    if (!validateServiceRoleAuth(req)) {
      logExportJobStep("auth-rejected", { correlation_id: ctx.correlationId });
      return createErrorResponse("Unauthorized", 401);
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse("Invalid JSON body", 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as unknown as ExportJobAdminClient;

    const result = await processExportJobPayload(adminClient, body);
    if (!result.ok) {
      // Permanent logical failures are ACKed by queue-worker (permanent: true).
      // Transient infrastructure errors should return non-2xx so the message retries.
      const permanent = !/timeout|network|fetch failed|ECONNRESET/i.test(result.error ?? "");
      return createJsonResponse(
        { success: false, permanent, error: result.error },
        permanent ? 200 : 500,
      );
    }

    return createJsonResponse({
      success: true,
      rowCount: result.rowCount ?? 0,
    });
  }));
}
