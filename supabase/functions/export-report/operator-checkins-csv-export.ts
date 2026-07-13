/**
 * Operator check-ins CSV export delegate — data access via shared reports layer (#1192).
 */

import { fetchReportRows } from "../_shared/reports/fetch-rows.ts";
import {
  buildReportCsv,
  formatSubmittedAt,
  __formatCsvTestables,
} from "../_shared/reports/format-csv.ts";
import { asReportDataClient } from "../_shared/reports/types.ts";
import type { ExportFilters, ExportResult, UserSupabaseClient } from "./rate-limit.ts";
import { MAX_ROWS } from "./rate-limit.ts";

export async function exportOperatorCheckins(
  supabase: UserSupabaseClient,
  organizationId: string,
  filters: ExportFilters,
  columns: string[],
): Promise<ExportResult> {
  const rows = await fetchReportRows(asReportDataClient(supabase), {
    reportType: "operator-check-ins",
    organizationId,
    filters,
    columns,
    limit: MAX_ROWS,
  });
  return buildReportCsv("operator-check-ins", rows, columns);
}

export const __operatorCheckinsCsvTestables = {
  formatSubmittedAt,
  formatCapturedFieldsSummary: __formatCsvTestables.formatCapturedFieldsSummary,
  formatTemplateName: __formatCsvTestables.formatTemplateName,
};
