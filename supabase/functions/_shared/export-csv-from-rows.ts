/**
 * Build CSV text from pre-shaped JSONB rows returned by export_*_csv_rows RPCs.
 * Keeps formula-injection neutralization consistent with csv-export.ts.
 */

import { escapeCSVValue } from "./csv-export.ts";
import { formatDate } from "./export-formatters.ts";

export type ExportRow = Record<string, unknown>;

const EQUIPMENT_LABELS: Record<string, string> = {
  name: "Name",
  manufacturer: "Manufacturer",
  model: "Model",
  serial_number: "Serial Number",
  status: "Status",
  location: "Location",
  team_name: "Team",
  installation_date: "Installation Date",
  last_maintenance: "Last Maintenance",
  working_hours: "Working Hours",
  warranty_expiration: "Warranty Expiration",
  notes: "Notes",
  created_at: "Created Date",
  url: "URL",
};

const WORK_ORDER_LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  status: "Status",
  priority: "Priority",
  assignee_name: "Assignee",
  team_name: "Team",
  equipment_name: "Equipment",
  created_date: "Created Date",
  due_date: "Due Date",
  completed_date: "Completed Date",
  estimated_hours: "Estimated Hours",
  has_pm: "Has PM Checklist",
};

function formatCell(column: string, value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (
    column.endsWith("_date") ||
    column === "created_at" ||
    column === "installation_date" ||
    column === "last_maintenance" ||
    column === "warranty_expiration"
  ) {
    return formatDate(String(value));
  }
  if (column === "has_pm") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "object") {
    return escapeCSVValue(JSON.stringify(value));
  }
  return escapeCSVValue(value);
}

export function buildEquipmentUrl(equipmentId: string, siteUrl?: string): string {
  const base = siteUrl || Deno.env.get("PUBLIC_SITE_URL") || "https://app.equipqr.com";
  return `${base}/dashboard/equipment/${equipmentId}`;
}

export function buildCsvFromShapedRows(
  rows: ExportRow[],
  columns: string[],
  labels: Record<string, string>,
  options?: {
    urlColumn?: { columnKey: string; idField: string; buildUrl: (id: string) => string };
  },
): { csvContent: string; rowCount: number } {
  if (rows.length === 0) {
    return { csvContent: "No data found", rowCount: 0 };
  }

  const validColumns = columns.filter((col) => col in labels || col === "custom_attributes");
  if (validColumns.length === 0) {
    return { csvContent: "No data found", rowCount: 0 };
  }

  const customKeys = new Set<string>();
  if (validColumns.includes("custom_attributes")) {
    for (const row of rows) {
      const attrs = row.custom_attributes;
      if (attrs && typeof attrs === "object" && !Array.isArray(attrs)) {
        Object.keys(attrs as Record<string, unknown>).forEach((k) => customKeys.add(k));
      }
    }
  }

  const headers: string[] = [];
  for (const col of validColumns) {
    if (col === "custom_attributes") {
      customKeys.forEach((k) => headers.push(escapeCSVValue(k)));
    } else {
      headers.push(labels[col] || col);
    }
  }

  const lines: string[] = [headers.join(",")];

  for (const row of rows) {
    const values: string[] = [];
    for (const col of validColumns) {
      if (col === "custom_attributes") {
        const attrs = (row.custom_attributes as Record<string, unknown> | null) ?? {};
        customKeys.forEach((k) => values.push(escapeCSVValue(attrs[k] ?? "")));
      } else if (options?.urlColumn && col === options.urlColumn.columnKey) {
        const id = String(row[options.urlColumn.idField] ?? "");
        values.push(escapeCSVValue(options.urlColumn.buildUrl(id)));
      } else {
        values.push(formatCell(col, row[col]));
      }
    }
    lines.push(values.join(","));
  }

  return { csvContent: lines.join("\n"), rowCount: rows.length };
}

export function buildEquipmentCsvFromRows(
  rows: ExportRow[],
  columns: string[],
): { csvContent: string; rowCount: number } {
  return buildCsvFromShapedRows(rows, columns, EQUIPMENT_LABELS, {
    urlColumn: {
      columnKey: "url",
      idField: "id",
      buildUrl: (id) => buildEquipmentUrl(id),
    },
  });
}

export function buildWorkOrdersCsvFromRows(
  rows: ExportRow[],
  columns: string[],
): { csvContent: string; rowCount: number } {
  return buildCsvFromShapedRows(rows, columns, WORK_ORDER_LABELS);
}
