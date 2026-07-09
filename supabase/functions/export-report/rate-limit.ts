/**
 * Export rate limiting and shared export types.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

export const MAX_ROWS = 50000;

export interface ExportFilters {
  status?: string;
  teamId?: string;
  location?: string;
  priority?: string;
  dateRange?: {
    from?: string;
    to?: string;
  };
}

export interface ExportResult {
  csvContent: string;
  rowCount: number;
}

export type UserSupabaseClient = SupabaseClient;

function isMissingRelationError(error: { code?: string } | null): boolean {
  return error?.code === "42P01";
}

/**
 * Check rate limits for export requests.
 * - Max 5 exports per user per minute
 * - Max 50 exports per organization per hour
 */
export async function checkRateLimit(
  supabase: UserSupabaseClient,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const { error: tableCheckError } = await supabase
    .from("export_request_log")
    .select("id", { head: true, count: "exact" })
    .eq("organization_id", organizationId)
    .limit(1);

  if (tableCheckError) {
    if (isMissingRelationError(tableCheckError)) {
      console.log("export_request_log table not found, skipping rate limit check");
      return true;
    }

    console.error("[export-report] rate limit probe failed", { code: tableCheckError.code });
    return false;
  }

  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count: userCount, error: userCountError } = await supabase
    .from("export_request_log")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .gte("requested_at", oneMinuteAgo);

  if (userCountError) {
    console.error("[export-report] user rate limit count failed", { code: userCountError.code });
    return false;
  }

  if ((userCount ?? 0) >= 5) {
    return false;
  }

  const { count: orgCount, error: orgCountError } = await supabase
    .from("export_request_log")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .gte("requested_at", oneHourAgo);

  if (orgCountError) {
    console.error("[export-report] org rate limit count failed", { code: orgCountError.code });
    return false;
  }

  if ((orgCount ?? 0) >= 50) {
    return false;
  }

  return true;
}

export const __rateLimitTestables = {
  isMissingRelationError,
};
