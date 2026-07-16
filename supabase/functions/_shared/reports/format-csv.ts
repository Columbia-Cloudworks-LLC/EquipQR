/**
 * CSV formatting for table-shaped Fleet Export Console reports (#1192).
 */

import { buildCsvTable, escapeCSVValue } from "../csv-export.ts";
import {
  buildEquipmentCsvFromRows,
  buildWorkOrdersCsvFromRows,
  type ExportRow,
} from "../export-csv-from-rows.ts";
import { formatDate, formatDateTime } from "../export-formatters.ts";
import { REPORT_COLUMN_LABELS, filterAllowedColumns } from "./column-whitelists.ts";
import type { FlattenedAlternateGroupMember } from "./fetch-rows.ts";
import {
  computeIsLowStock,
  formatPrimaryFlag,
  formatUnitCost,
} from "./inventory-formatters.ts";
import type { FleetReportType, ReportCsvResult, ReportRow } from "./types.ts";

export function formatHasPm(hasPm: unknown): string {
  return hasPm ? "Yes" : "No";
}

export function formatScannedAt(dateString: string | null): string {
  return formatDateTime(dateString);
}

export function formatSubmittedAt(dateString: string | null): string {
  return formatDateTime(dateString);
}

function formatCapturedFieldsSummary(row: ReportRow): string {
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

function formatTemplateName(row: ReportRow): string {
  const snapshot = row.template_snapshot;
  if (typeof snapshot !== "object" || snapshot === null) return "";
  const name = (snapshot as Record<string, unknown>).name;
  return typeof name === "string" ? name : "";
}

function formatQuickFormName(row: ReportRow): string {
  const snapshot = row.form_snapshot;
  if (typeof snapshot !== "object" || snapshot === null) return "Quick form";
  const name = (snapshot as Record<string, unknown>).name;
  return typeof name === "string" ? name : "Quick form";
}

function formatQuickFormCapturedFieldsSummary(row: ReportRow): string {
  const fieldValues = row.field_values;
  if (!Array.isArray(fieldValues)) return "";
  const parts: string[] = [];
  for (const field of fieldValues) {
    if (typeof field !== "object" || field === null) continue;
    const label = (field as Record<string, unknown>).label;
    const value = (field as Record<string, unknown>).value;
    if (typeof label === "string") {
      parts.push(`${label}: ${value ?? ""}`);
    }
  }
  return parts.join(" | ");
}

function formatQuickFormTimezone(row: ReportRow): string {
  const ctx = row.client_context;
  if (typeof ctx !== "object" || ctx === null) return "";
  const timezone = (ctx as Record<string, unknown>).browser_timezone;
  return typeof timezone === "string" ? timezone : "";
}

function formatQuickFormGps(row: ReportRow): string {
  const ctx = row.client_context;
  if (typeof ctx !== "object" || ctx === null) return "";
  const gps = (ctx as Record<string, unknown>).gps;
  if (typeof gps !== "object" || gps === null) return "";
  const latitude = (gps as Record<string, unknown>).latitude;
  const longitude = (gps as Record<string, unknown>).longitude;
  if (latitude == null || longitude == null) return "";
  return `${latitude}, ${longitude}`;
}

function buildInventoryCsv(rows: ReportRow[], columns: string[]): ReportCsvResult {
  if (rows.length === 0) {
    return { csvContent: "No data found", rowCount: 0 };
  }

  const columnMap: Record<string, (item: ReportRow) => string> = {
    name: (item) => escapeCSVValue(item.name),
    description: (item) => escapeCSVValue(item.description),
    sku: (item) => escapeCSVValue(item.sku),
    external_id: (item) => escapeCSVValue(item.external_id),
    quantity_on_hand: (item) => escapeCSVValue(item.quantity_on_hand),
    low_stock_threshold: (item) => escapeCSVValue(item.low_stock_threshold),
    default_unit_cost: (item) => formatUnitCost(item.default_unit_cost as number | null),
    location: (item) => escapeCSVValue(item.location),
    is_low_stock: (item) => computeIsLowStock(
      item.quantity_on_hand as number,
      item.low_stock_threshold as number,
    ),
    created_at: (item) => formatDate(item.created_at as string),
  };

  return {
    csvContent: buildCsvTable(
      rows,
      columns,
      columnMap,
      REPORT_COLUMN_LABELS.inventory,
    ),
    rowCount: rows.length,
  };
}

function buildScansCsv(rows: ReportRow[], columns: string[]): ReportCsvResult {
  if (rows.length === 0) {
    return { csvContent: "No data found", rowCount: 0 };
  }

  const columnMap: Record<string, (item: ReportRow) => string> = {
    equipment_name: (item) =>
      escapeCSVValue((item.equipment as Record<string, unknown>)?.name ?? ""),
    scanned_by_name: (item) =>
      escapeCSVValue((item.profiles as Record<string, unknown>)?.full_name ?? ""),
    scanned_at: (item) => formatScannedAt(item.scanned_at as string),
    location: (item) => escapeCSVValue(item.location),
    notes: (item) => escapeCSVValue(item.notes),
  };

  return {
    csvContent: buildCsvTable(rows, columns, columnMap, REPORT_COLUMN_LABELS.scans),
    rowCount: rows.length,
  };
}

function buildOperatorCheckinsCsv(rows: ReportRow[], columns: string[]): ReportCsvResult {
  if (rows.length === 0) {
    return { csvContent: "No data found", rowCount: 0 };
  }

  const columnMap: Record<string, (item: ReportRow) => string> = {
    equipment_name: (item) =>
      escapeCSVValue((item.equipment as Record<string, unknown>)?.name ?? ""),
    template_name: (item) => escapeCSVValue(formatTemplateName(item)),
    serial_number: (item) =>
      escapeCSVValue((item.equipment as Record<string, unknown>)?.serial_number ?? ""),
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
    checklist_answers_json: (item) =>
      escapeCSVValue(JSON.stringify(item.checklist_answers ?? [])),
  };

  return {
    csvContent: buildCsvTable(
      rows,
      columns,
      columnMap,
      REPORT_COLUMN_LABELS["operator-check-ins"],
    ),
    rowCount: rows.length,
  };
}

function buildQuickFormsCsv(rows: ReportRow[], columns: string[]): ReportCsvResult {
  if (rows.length === 0) {
    return { csvContent: "No data found", rowCount: 0 };
  }

  const columnMap: Record<string, (item: ReportRow) => string> = {
    form_name: (item) => escapeCSVValue(formatQuickFormName(item)),
    submitted_at: (item) => formatSubmittedAt(item.submitted_at as string),
    captured_fields_summary: (item) =>
      escapeCSVValue(formatQuickFormCapturedFieldsSummary(item)),
    timezone: (item) => escapeCSVValue(formatQuickFormTimezone(item)),
    gps: (item) => escapeCSVValue(formatQuickFormGps(item)),
    field_values_json: (item) => escapeCSVValue(JSON.stringify(item.field_values ?? [])),
    submission_id: (item) => escapeCSVValue(item.id as string),
  };

  return {
    csvContent: buildCsvTable(
      rows,
      columns,
      columnMap,
      REPORT_COLUMN_LABELS["quick-forms"],
    ),
    rowCount: rows.length,
  };
}

function buildAlternateGroupsCsv(
  rows: FlattenedAlternateGroupMember[],
  columns: string[],
): ReportCsvResult {
  if (rows.length === 0) {
    return { csvContent: "No data found", rowCount: 0 };
  }

  const columnMap: Record<string, (item: FlattenedAlternateGroupMember) => string> = {
    group_name: (item) => escapeCSVValue(item.group_name),
    group_status: (item) => escapeCSVValue(item.group_status),
    group_description: (item) => escapeCSVValue(item.group_description),
    member_type: (item) => escapeCSVValue(item.member_type),
    is_primary: (item) => formatPrimaryFlag(item.is_primary),
    item_name: (item) => escapeCSVValue(item.item_name),
    item_sku: (item) => escapeCSVValue(item.item_sku),
    quantity_on_hand: (item) => escapeCSVValue(item.quantity_on_hand),
    is_low_stock: (item) => {
      if (item.item_name === null) return "";
      return computeIsLowStock(item.quantity_on_hand, item.low_stock_threshold);
    },
    default_unit_cost: (item) => formatUnitCost(item.default_unit_cost),
    location: (item) => escapeCSVValue(item.location),
    identifier_type: (item) => escapeCSVValue(item.identifier_type),
    identifier_value: (item) => escapeCSVValue(item.identifier_value),
    identifier_manufacturer: (item) => escapeCSVValue(item.identifier_manufacturer),
    group_notes: (item) => escapeCSVValue(item.group_notes),
  };

  return {
    csvContent: buildCsvTable(
      rows,
      columns,
      columnMap,
      REPORT_COLUMN_LABELS["alternate-groups"],
    ),
    rowCount: rows.length,
  };
}

/**
 * Build CSV output from pre-fetched report rows.
 */
export function buildReportCsv(
  reportType: FleetReportType,
  rows: ReportRow[] | ExportRow[] | FlattenedAlternateGroupMember[],
  columns: string[],
): ReportCsvResult {
  const allowedColumns = filterAllowedColumns(reportType, columns);
  if (allowedColumns.length === 0) {
    return { csvContent: "No data found", rowCount: 0 };
  }

  if (rows.length === 0) {
    return { csvContent: "No data found", rowCount: 0 };
  }

  switch (reportType) {
    case "equipment":
      return buildEquipmentCsvFromRows(rows as ExportRow[], allowedColumns);
    case "work-orders":
      return buildWorkOrdersCsvFromRows(rows as ExportRow[], allowedColumns);
    case "inventory":
      return buildInventoryCsv(rows as ReportRow[], allowedColumns);
    case "scans":
      return buildScansCsv(rows as ReportRow[], allowedColumns);
    case "operator-check-ins":
      return buildOperatorCheckinsCsv(rows as ReportRow[], allowedColumns);
    case "quick-forms":
      return buildQuickFormsCsv(rows as ReportRow[], allowedColumns);
    case "alternate-groups":
      return buildAlternateGroupsCsv(rows as FlattenedAlternateGroupMember[], allowedColumns);
    default: {
      const _exhaustive: never = reportType;
      throw new Error(`Unsupported report type: ${_exhaustive}`);
    }
  }
}

export const __formatCsvTestables = {
  formatCapturedFieldsSummary,
  formatTemplateName,
  formatQuickFormName,
  formatQuickFormCapturedFieldsSummary,
  formatQuickFormTimezone,
  formatQuickFormGps,
};
