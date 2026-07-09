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

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import {
  createErrorResponse,
  createJsonResponse,
  handleCorsPreflightIfNeeded,
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
import {
  buildEquipmentCsvFromRows,
  buildWorkOrdersCsvFromRows,
  type ExportRow,
} from "../_shared/export-csv-from-rows.ts";

const FUNCTION_NAME = "process-export-job";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** Minimal admin client surface used by the worker (keeps tests stub-friendly). */
export type ExportJobAdminClient = {
  // deno-lint-ignore no-explicit-any
  from: (table: string) => any;
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

async function fetchEquipmentRows(
  adminClient: ExportJobAdminClient,
  organizationId: string,
  filters: Record<string, unknown>,
): Promise<ExportRow[]> {
  let query = adminClient
    .from("equipment")
    .select(
      "id, name, manufacturer, model, serial_number, status, location, installation_date, last_maintenance, working_hours, warranty_expiration, notes, custom_attributes, created_at, teams:team_id(name)",
    )
    .eq("organization_id", organizationId)
    .order("name")
    .limit(50000);

  if (typeof filters.status === "string") query = query.eq("status", filters.status);
  if (typeof filters.teamId === "string") query = query.eq("team_id", filters.teamId);
  if (typeof filters.location === "string") {
    query = query.ilike("location", `%${filters.location}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((item: Record<string, unknown>) => ({
    ...item,
    team_name: (item.teams as { name?: string } | null)?.name ?? "",
  }));
}

async function fetchWorkOrderRows(
  adminClient: ExportJobAdminClient,
  organizationId: string,
  filters: Record<string, unknown>,
  accessibleTeamIds: string[] | null,
  dateRange: { from?: string; to?: string },
): Promise<ExportRow[]> {
  let query = adminClient
    .from("work_orders")
    .select(
      "id, title, description, status, priority, created_date, due_date, completed_date, estimated_hours, assignee_name, has_pm, teams:team_id(name), equipment:equipment_id(name)",
    )
    .eq("organization_id", organizationId)
    .not("equipment_id", "is", null)
    .order("created_date", { ascending: false })
    .limit(50000);

  if (accessibleTeamIds) {
    if (accessibleTeamIds.length === 0) return [];
    query = query.in("team_id", accessibleTeamIds);
  }
  if (typeof filters.status === "string") query = query.eq("status", filters.status);
  if (typeof filters.teamId === "string") query = query.eq("team_id", filters.teamId);
  if (typeof filters.priority === "string") query = query.eq("priority", filters.priority);
  if (dateRange.from) query = query.gte("created_date", dateRange.from);
  if (dateRange.to) query = query.lte("created_date", dateRange.to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((item: Record<string, unknown>) => ({
    ...item,
    team_name: (item.teams as { name?: string } | null)?.name ?? "",
    equipment_name: (item.equipment as { name?: string } | null)?.name ?? "",
  }));
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
  let rows: ExportRow[];
  let columns: string[];

  if (message.report_type === "equipment") {
    columns = asStringArray(requestPayload.columns, [
      "name",
      "manufacturer",
      "model",
      "serial_number",
      "status",
      "location",
      "team_name",
    ]);
    rows = await fetchEquipmentRows(adminClient, message.organization_id, filters);
  } else {
    columns = asStringArray(requestPayload.columns, [
      "title",
      "status",
      "priority",
      "assignee_name",
      "team_name",
      "equipment_name",
      "created_date",
    ]);
    const accessibleTeamIds = Array.isArray(requestPayload.accessibleTeamIds)
      ? (requestPayload.accessibleTeamIds as string[])
      : null;
    rows = await fetchWorkOrderRows(
      adminClient,
      message.organization_id,
      filters,
      accessibleTeamIds,
      dateRange,
    );
  }

  const built = message.report_type === "equipment"
    ? buildEquipmentCsvFromRows(rows, columns)
    : buildWorkOrdersCsvFromRows(rows, columns);

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
