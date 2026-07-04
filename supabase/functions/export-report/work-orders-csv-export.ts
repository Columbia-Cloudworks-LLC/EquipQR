/**
 * Work orders CSV export.
 */

import { buildCsvTable, escapeCSVValue } from "../_shared/csv-export.ts";
import { formatDate } from "../_shared/export-formatters.ts";
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

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.teamId) {
    query = query.eq("team_id", filters.teamId);
  }
  if (filters.priority) {
    query = query.eq("priority", filters.priority);
  }
  if (filters.dateRange?.from) {
    query = query.gte("created_date", filters.dateRange.from);
  }
  if (filters.dateRange?.to) {
    query = query.lte("created_date", filters.dateRange.to);
  }

  const { data: workOrders, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch work orders: ${error.message}`);
  }

  if (!workOrders || workOrders.length === 0) {
    return { csvContent: "No data found", rowCount: 0 };
  }

  const columnMap: Record<string, (item: Record<string, unknown>) => string> = {
    title: (item) => escapeCSVValue(item.title),
    description: (item) => escapeCSVValue(item.description),
    status: (item) => escapeCSVValue(item.status),
    priority: (item) => escapeCSVValue(item.priority),
    assignee_name: (item) => escapeCSVValue(item.assignee_name),
    team_name: (item) => escapeCSVValue((item.teams as Record<string, unknown>)?.name ?? ""),
    equipment_name: (item) => escapeCSVValue((item.equipment as Record<string, unknown>)?.name ?? ""),
    created_date: (item) => formatDate(item.created_date as string),
    due_date: (item) => formatDate(item.due_date as string),
    completed_date: (item) => formatDate(item.completed_date as string),
    estimated_hours: (item) => escapeCSVValue(item.estimated_hours ?? ""),
    has_pm: (item) => formatHasPm(item.has_pm),
  };

  const columnLabels: Record<string, string> = {
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

  return {
    csvContent: buildCsvTable(workOrders, columns, columnMap, columnLabels),
    rowCount: workOrders.length,
  };
}

export const __workOrdersCsvTestables = {
  formatHasPm,
};
