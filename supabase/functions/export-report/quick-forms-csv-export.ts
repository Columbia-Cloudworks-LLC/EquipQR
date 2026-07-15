/**
 * Quick forms CSV export delegate — data access via shared reports layer (#1184).
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

export async function exportQuickForms(
  supabase: UserSupabaseClient,
  organizationId: string,
  filters: ExportFilters,
  columns: string[],
): Promise<ExportResult> {
  const rows = await fetchReportRows(asReportDataClient(supabase), {
    reportType: "quick-forms",
    organizationId,
    filters,
    columns,
    limit: MAX_ROWS,
  });
  return buildReportCsv("quick-forms", rows, columns);
}

export const __quickFormsCsvTestables = {
  formatSubmittedAt,
  formatQuickFormName: __formatCsvTestables.formatQuickFormName,
  formatQuickFormCapturedFieldsSummary: __formatCsvTestables.formatQuickFormCapturedFieldsSummary,
  formatQuickFormGps: __formatCsvTestables.formatQuickFormGps,
};
