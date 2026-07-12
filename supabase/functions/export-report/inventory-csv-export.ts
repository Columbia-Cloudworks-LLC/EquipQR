/**
 * Inventory CSV export delegate — data access via shared reports layer (#1192).
 */

import {
  computeIsLowStock,
  formatUnitCost,
} from "../_shared/reports/inventory-formatters.ts";
import { fetchReportRows } from "../_shared/reports/fetch-rows.ts";
import { buildReportCsv } from "../_shared/reports/format-csv.ts";
import { asReportDataClient } from "../_shared/reports/types.ts";
import type { ExportFilters, ExportResult, UserSupabaseClient } from "./rate-limit.ts";
import { MAX_ROWS } from "./rate-limit.ts";

export async function exportInventory(
  supabase: UserSupabaseClient,
  organizationId: string,
  filters: ExportFilters,
  columns: string[],
): Promise<ExportResult> {
  const rows = await fetchReportRows(asReportDataClient(supabase), {
    reportType: "inventory",
    organizationId,
    filters,
    columns,
    limit: MAX_ROWS,
  });
  return buildReportCsv("inventory", rows, columns);
}

export const __inventoryCsvTestables = {
  formatUnitCost,
  computeIsLowStock,
};
