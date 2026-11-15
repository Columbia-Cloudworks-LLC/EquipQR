/**
 * `export_request_log` row helpers shared by the export handlers.
 * Each helper takes the Supabase client explicitly so callers keep their own
 * user-scoped vs admin client choice.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

/** Insert a `pending` export log row. `id` is undefined when the insert failed. */
export async function insertPendingExportRequestLog(
  client: SupabaseClient,
  params: { userId: string; organizationId: string; reportType: string },
): Promise<{ id: string | undefined; error: { message: string } | null }> {
  const { data, error } = await client
    .from("export_request_log")
    .insert({
      user_id: params.userId,
      organization_id: params.organizationId,
      report_type: params.reportType,
      row_count: 0,
      status: "pending",
    })
    .select("id")
    .single();

  return { id: data?.id, error };
}

/** Mark an export log row completed (with its row count) or failed. Returns the update error, if any. */
export async function finishExportRequestLog(
  client: SupabaseClient,
  exportLogId: string,
  outcome: { status: "completed"; rowCount: number } | { status: "failed" },
): Promise<{ message: string } | null> {
  const patch = outcome.status === "completed"
    ? {
      status: "completed",
      row_count: outcome.rowCount,
      completed_at: new Date().toISOString(),
    }
    : {
      status: "failed",
      completed_at: new Date().toISOString(),
    };

  const { error } = await client
    .from("export_request_log")
    .update(patch)
    .eq("id", exportLogId);

  return error;
}
