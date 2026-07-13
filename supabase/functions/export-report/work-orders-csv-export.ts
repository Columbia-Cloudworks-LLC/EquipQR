/**
 * Work orders CSV export delegate — data access via shared reports layer (#1192).
 */

import { fetchReportRows } from "../_shared/reports/fetch-rows.ts";
import { buildReportCsv, formatHasPm } from "../_shared/reports/format-csv.ts";
import { asReportDataClient } from "../_shared/reports/types.ts";
import type { ExportFilters, ExportResult, UserSupabaseClient } from "./rate-limit.ts";
import { MAX_ROWS } from "./rate-limit.ts";

export async function exportWorkOrders(
  supabase: UserSupabaseClient,
  organizationId: string,
  filters: ExportFilters,
  columns: string[],
  accessibleTeamIds?: string[],
): Promise<ExportResult> {
  if (accessibleTeamIds !== undefined && accessibleTeamIds.length === 0) {
    return { csvContent: "No data found", rowCount: 0 };
  }

  const rows = await fetchReportRows(asReportDataClient(supabase), {
    reportType: "work-orders",
    organizationId,
    filters,
    columns,
    accessibleTeamIds,
    limit: MAX_ROWS,
  });
  return buildReportCsv("work-orders", rows, columns);
}

export const __workOrdersCsvTestables = {
  formatHasPm,
};
