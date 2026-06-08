/**
 * Equipment CSV export.
 */

import { escapeCSVValue } from "../_shared/csv-export.ts";
import { formatDate } from "../_shared/export-formatters.ts";
import type { ExportFilters, ExportResult, UserSupabaseClient } from "./rate-limit.ts";
import { MAX_ROWS } from "./rate-limit.ts";

export function buildEquipmentUrl(equipmentId: string, siteUrl?: string): string {
  const base = siteUrl || Deno.env.get("PUBLIC_SITE_URL") || "https://app.equipqr.com";
  return `${base}/dashboard/equipment/${equipmentId}`;
}

export async function exportEquipment(
  supabase: UserSupabaseClient,
  organizationId: string,
  filters: ExportFilters,
  columns: string[],
): Promise<ExportResult> {
  let query = supabase
    .from("equipment")
    .select(`
      id,
      name,
      manufacturer,
      model,
      serial_number,
      status,
      location,
      installation_date,
      last_maintenance,
      working_hours,
      warranty_expiration,
      notes,
      custom_attributes,
      created_at,
      team_id,
      teams:team_id (name)
    `)
    .eq("organization_id", organizationId)
    .order("name")
    .limit(MAX_ROWS);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.teamId) {
    query = query.eq("team_id", filters.teamId);
  }
  if (filters.location) {
    query = query.ilike("location", `%${filters.location}%`);
  }

  const { data: equipment, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch equipment: ${error.message}`);
  }

  if (!equipment || equipment.length === 0) {
    return { csvContent: "No data found", rowCount: 0 };
  }

  const columnMap: Record<string, (item: Record<string, unknown>) => string> = {
    name: (item) => escapeCSVValue(item.name),
    manufacturer: (item) => escapeCSVValue(item.manufacturer),
    model: (item) => escapeCSVValue(item.model),
    serial_number: (item) => escapeCSVValue(item.serial_number),
    status: (item) => escapeCSVValue(item.status),
    location: (item) => escapeCSVValue(item.location),
    team_name: (item) => escapeCSVValue((item.teams as Record<string, unknown>)?.name ?? ""),
    installation_date: (item) => formatDate(item.installation_date as string),
    last_maintenance: (item) => formatDate(item.last_maintenance as string),
    working_hours: (item) => escapeCSVValue(item.working_hours ?? "0"),
    warranty_expiration: (item) => formatDate(item.warranty_expiration as string),
    notes: (item) => escapeCSVValue(item.notes),
    created_at: (item) => formatDate(item.created_at as string),
    url: (item) => escapeCSVValue(buildEquipmentUrl(String(item.id))),
  };

  const columnLabels: Record<string, string> = {
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

  const validColumns = columns.filter((col) => col in columnMap || col === "custom_attributes");

  const headers: string[] = [];
  for (const col of validColumns) {
    if (col === "custom_attributes") {
      const allCustomKeys = new Set<string>();
      for (const item of equipment) {
        if (item.custom_attributes && typeof item.custom_attributes === "object") {
          Object.keys(item.custom_attributes as Record<string, unknown>).forEach((k) => allCustomKeys.add(k));
        }
      }
      allCustomKeys.forEach((k) => headers.push(escapeCSVValue(k)));
    } else {
      headers.push(columnLabels[col] || col);
    }
  }

  const rows: string[] = [headers.join(",")];

  for (const item of equipment) {
    const rowValues: string[] = [];

    for (const col of validColumns) {
      if (col === "custom_attributes") {
        const allCustomKeys = new Set<string>();
        for (const eq of equipment) {
          if (eq.custom_attributes && typeof eq.custom_attributes === "object") {
            Object.keys(eq.custom_attributes as Record<string, unknown>).forEach((k) => allCustomKeys.add(k));
          }
        }
        allCustomKeys.forEach((k) => {
          const customAttrs = item.custom_attributes as Record<string, unknown> | null;
          rowValues.push(escapeCSVValue(customAttrs?.[k] ?? ""));
        });
      } else if (columnMap[col]) {
        rowValues.push(columnMap[col](item as Record<string, unknown>));
      }
    }

    rows.push(rowValues.join(","));
  }

  return {
    csvContent: rows.join("\n"),
    rowCount: equipment.length,
  };
}

export const __equipmentCsvTestables = {
  buildEquipmentUrl,
};
