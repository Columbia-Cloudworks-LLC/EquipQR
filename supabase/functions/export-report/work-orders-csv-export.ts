/**
 * Work orders CSV export — prefers DB RPC for minimal egress (#1193).
 */

import {
  buildWorkOrdersCsvFromRows,
  type ExportRow,
} from "../_shared/export-csv-from-rows.ts";
import type { ExportFilters, ExportResult, UserSupabaseClient } from "./rate-limit.ts";
import { MAX_ROWS } from "./rate-limit.ts";

export function formatHasPm(hasPm: unknown): string {
  return hasPm ? "Yes" : "No";
}

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

  const { data, error } = await supabase.rpc("export_work_orders_csv_rows", {
    p_organization_id: organizationId,
    p_columns: columns,
    p_status: filters.status ?? null,
    p_team_id: filters.teamId ?? null,
    p_priority: filters.priority ?? null,
    p_date_from: filters.dateRange?.from ?? null,
    p_date_to: filters.dateRange?.to ?? null,
    p_accessible_team_ids: accessibleTeamIds ?? null,
    p_limit: MAX_ROWS,
  });

  if (error) {
    console.warn("[export-work-orders] RPC unavailable, falling back to table select", {
      message: error.message,
    });
    return exportWorkOrdersLegacy(supabase, organizationId, filters, columns, accessibleTeamIds);
  }

  const rows = (Array.isArray(data) ? data : []) as ExportRow[];
  return buildWorkOrdersCsvFromRows(rows, columns);
}

async function exportWorkOrdersLegacy(
  supabase: UserSupabaseClient,
  organizationId: string,
  filters: ExportFilters,
  columns: string[],
  accessibleTeamIds?: string[],
): Promise<ExportResult> {
  let query = supabase
    .from("work_orders")
    .select(`
      id,
      title,
      description,
      status,
      priority,
      created_date,
      due_date,
      completed_date,
      estimated_hours,
      assignee_name,
      team_id,
      equipment_id,
      has_pm,
      teams:team_id (name),
      equipment:equipment_id (name)
    `)
    .eq("organization_id", organizationId)
    .not("equipment_id", "is", null)
    .order("created_date", { ascending: false })
    .limit(MAX_ROWS);

  if (accessibleTeamIds !== undefined) {
    query = query.in("team_id", accessibleTeamIds);
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.teamId) query = query.eq("team_id", filters.teamId);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.dateRange?.from) query = query.gte("created_date", filters.dateRange.from);
  if (filters.dateRange?.to) query = query.lte("created_date", filters.dateRange.to);

  const { data: workOrders, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch work orders: ${error.message}`);
  }

  const rows = (workOrders ?? []).map((item) => ({
    ...item,
    team_name: (item.teams as { name?: string } | null)?.name ?? "",
    equipment_name: (item.equipment as { name?: string } | null)?.name ?? "",
  })) as ExportRow[];

  return buildWorkOrdersCsvFromRows(rows, columns);
}

export const __workOrdersCsvTestables = {
  formatHasPm,
};
