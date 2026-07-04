/**
 * Operator check-ins CSV export (#1091).
 */

import { buildCsvTable, escapeCSVValue } from "../_shared/csv-export.ts";
import { formatDateTime } from "../_shared/export-formatters.ts";
import type { ExportFilters, ExportResult, UserSupabaseClient } from "./rate-limit.ts";
import { MAX_ROWS } from "./rate-limit.ts";

export function formatSubmittedAt(dateString: string | null): string {
  return formatDateTime(dateString);
}

function formatCapturedFieldsSummary(row: Record<string, unknown>): string {
  const buckets = [
    row.operator_field_values,
    row.client_field_values,
    row.equipment_field_values,
  ];
  const parts: string[] = [];
  for (const bucket of buckets) {
    if (!Array.isArray(bucket)) continue;
    for (const field of bucket) {
      if (typeof field !== "object" || field === null) continue;
      const label = (field as Record<string, unknown>).label;
      const value = (field as Record<string, unknown>).value;
      if (typeof label === "string") {
        parts.push(`${label}: ${value ?? ""}`);
      }
    }
  }
  return parts.join(" | ");
}

function formatTemplateName(row: Record<string, unknown>): string {
  const snapshot = row.template_snapshot;
  if (typeof snapshot !== "object" || snapshot === null) return "";
  const name = (snapshot as Record<string, unknown>).name;
  return typeof name === "string" ? name : "";
}

export async function exportOperatorCheckins(
  supabase: UserSupabaseClient,
  organizationId: string,
  filters: ExportFilters,
  columns: string[],
): Promise<ExportResult> {
  let query = supabase
    .from("operator_checkin_submissions")
    .select(`
      id,
      submitted_at,
      is_complete,
      required_item_count,
      answered_required_count,
      checklist_answers,
      operator_field_values,
      client_field_values,
      equipment_field_values,
      template_snapshot,
      equipment:equipment_id (id, name, serial_number, organization_id)
    `)
    .eq("organization_id", organizationId)
    .order("submitted_at", { ascending: false })
    .limit(MAX_ROWS);

  if (filters.dateRange?.from) {
    query = query.gte("submitted_at", filters.dateRange.from);
  }
  if (filters.dateRange?.to) {
    query = query.lte("submitted_at", filters.dateRange.to);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch operator check-ins: ${error.message}`);
  }

  const rows = (data ?? []).filter((row) => {
    const equipment = row.equipment as unknown as Record<string, unknown> | null;
    return equipment?.organization_id === organizationId;
  });

  if (rows.length === 0) {
    return { csvContent: "No data found", rowCount: 0 };
  }

  const columnMap: Record<string, (item: Record<string, unknown>) => string> = {
    equipment_name: (item) => escapeCSVValue((item.equipment as Record<string, unknown>)?.name ?? ""),
    template_name: (item) => escapeCSVValue(formatTemplateName(item)),
    serial_number: (item) => escapeCSVValue((item.equipment as Record<string, unknown>)?.serial_number ?? ""),
    submitted_at: (item) => formatSubmittedAt(item.submitted_at as string),
    captured_fields_summary: (item) => escapeCSVValue(formatCapturedFieldsSummary(item)),
    captured_fields_json: (item) => escapeCSVValue(JSON.stringify({
      operator: item.operator_field_values ?? [],
      client: item.client_field_values ?? [],
      equipment: item.equipment_field_values ?? [],
    })),
    is_complete: (item) => escapeCSVValue(item.is_complete ? "Yes" : "No"),
    checklist_summary: (item) =>
      escapeCSVValue(`${item.answered_required_count}/${item.required_item_count}`),
    checklist_answers_json: (item) => escapeCSVValue(JSON.stringify(item.checklist_answers ?? [])),
  };

  const columnLabels: Record<string, string> = {
    equipment_name: "Equipment",
    template_name: "Checklist",
    serial_number: "Unit #",
    submitted_at: "Submitted At",
    captured_fields_summary: "Captured Fields",
    captured_fields_json: "Captured Fields (JSON)",
    is_complete: "Complete",
    checklist_summary: "Required Items Answered",
    checklist_answers_json: "Checklist Answers (JSON)",
  };

  return {
    csvContent: buildCsvTable(rows, columns, columnMap, columnLabels),
    rowCount: rows.length,
  };
}

export const __operatorCheckinsCsvTestables = {
  formatSubmittedAt,
  formatCapturedFieldsSummary,
  formatTemplateName,
};
