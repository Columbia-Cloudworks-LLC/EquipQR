/**
 * Equipment CSV export — prefers DB RPC for minimal egress (#1193).
 */

import {
  buildEquipmentCsvFromRows,
  buildEquipmentUrl,
  type ExportRow,
} from "../_shared/export-csv-from-rows.ts";
import type { ExportFilters, ExportResult, UserSupabaseClient } from "./rate-limit.ts";
import { MAX_ROWS } from "./rate-limit.ts";

export async function exportEquipment(
  supabase: UserSupabaseClient,
  organizationId: string,
  filters: ExportFilters,
  columns: string[],
): Promise<ExportResult> {
  const { data, error } = await supabase.rpc("export_equipment_csv_rows", {
    p_organization_id: organizationId,
    p_columns: columns,
    p_status: filters.status ?? null,
    p_team_id: filters.teamId ?? null,
    p_location: filters.location ?? null,
    p_limit: MAX_ROWS,
  });

  if (error) {
    // Fallback for environments where the RPC is not yet applied.
    console.warn("[export-equipment] RPC unavailable, falling back to table select", {
      message: error.message,
    });
    return exportEquipmentLegacy(supabase, organizationId, filters, columns);
  }

  const rows = (Array.isArray(data) ? data : []) as ExportRow[];
  return buildEquipmentCsvFromRows(rows, columns);
}

async function exportEquipmentLegacy(
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

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.teamId) query = query.eq("team_id", filters.teamId);
  if (filters.location) query = query.ilike("location", `%${filters.location}%`);

  const { data: equipment, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch equipment: ${error.message}`);
  }

  const rows = (equipment ?? []).map((item) => ({
    ...item,
    team_name: (item.teams as { name?: string } | null)?.name ?? "",
  })) as ExportRow[];

  return buildEquipmentCsvFromRows(rows, columns);
}

export const __equipmentCsvTestables = {
  buildEquipmentUrl,
};
