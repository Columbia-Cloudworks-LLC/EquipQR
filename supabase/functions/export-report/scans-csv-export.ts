/**
 * Scans CSV export.
 */

import { buildCsvTable, escapeCSVValue } from "../_shared/csv-export.ts";
import { formatDateTime } from "../_shared/export-formatters.ts";
import type { ExportFilters, ExportResult, UserSupabaseClient } from "./rate-limit.ts";
import { MAX_ROWS } from "./rate-limit.ts";

export function formatScannedAt(dateString: string | null): string {
  return formatDateTime(dateString);
}

export async function exportScans(
  supabase: UserSupabaseClient,
  organizationId: string,
  filters: ExportFilters,
  columns: string[],
): Promise<ExportResult> {
  const query = supabase
    .from("scans")
    .select(`
      id,
      scanned_at,
      location,
      notes,
      scanned_by,
      equipment:equipment_id (
        id,
        name,
        organization_id
      ),
      profiles:scanned_by (
        full_name
      )
    `)
    .order("scanned_at", { ascending: false })
    .limit(MAX_ROWS);

  const { data: scans, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch scans: ${error.message}`);
  }

  const orgScans = (scans || []).filter((scan) => {
    const equipment = scan.equipment as unknown as Record<string, unknown> | null;
    return equipment?.organization_id === organizationId;
  });

  if (orgScans.length === 0) {
    return { csvContent: "No data found", rowCount: 0 };
  }

  let filteredScans = orgScans;
  if (filters.dateRange?.from) {
    const fromDate = new Date(filters.dateRange.from);
    filteredScans = filteredScans.filter((scan) => new Date(scan.scanned_at) >= fromDate);
  }
  if (filters.dateRange?.to) {
    const toDate = new Date(filters.dateRange.to);
    filteredScans = filteredScans.filter((scan) => new Date(scan.scanned_at) <= toDate);
  }

  const columnMap: Record<string, (item: Record<string, unknown>) => string> = {
    equipment_name: (item) => escapeCSVValue((item.equipment as Record<string, unknown>)?.name ?? ""),
    scanned_by_name: (item) => escapeCSVValue((item.profiles as Record<string, unknown>)?.full_name ?? ""),
    scanned_at: (item) => formatScannedAt(item.scanned_at as string),
    location: (item) => escapeCSVValue(item.location),
    notes: (item) => escapeCSVValue(item.notes),
  };

  const columnLabels: Record<string, string> = {
    equipment_name: "Equipment",
    scanned_by_name: "Scanned By",
    scanned_at: "Scanned At",
    location: "Location",
    notes: "Notes",
  };

  return {
    csvContent: buildCsvTable(filteredScans, columns, columnMap, columnLabels),
    rowCount: filteredScans.length,
  };
}

export const __scansCsvTestables = {
  formatScannedAt,
};
