/**
 * Shared Fleet Export Console row fetch layer (#1192).
 *
 * Centralizes org/team scoping, explicit column selection, and RPC/table-select
 * paths for all export-report types. Used by sync delegates and process-export-job.
 */

import type { ExportRow } from "../export-csv-from-rows.ts";
import { filterAllowedColumns } from "./column-whitelists.ts";
import type {
  FetchReportRowsParams,
  FleetReportType,
  ReportDataClient,
  ReportExportFilters,
  ReportQueryBuilder,
  ReportRow,
} from "./types.ts";

function reportQuery(client: ReportDataClient, table: string): ReportQueryBuilder {
  return client.from(table) as ReportQueryBuilder;
}

export const DEFAULT_MAX_REPORT_ROWS = 50_000;

const EQUIPMENT_TABLE_SELECT = `
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
`;

const WORK_ORDERS_TABLE_SELECT = `
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
`;

const INVENTORY_TABLE_SELECT = `
  id,
  name,
  description,
  sku,
  external_id,
  quantity_on_hand,
  low_stock_threshold,
  default_unit_cost,
  location,
  created_at
`;

const SCANS_TABLE_SELECT = `
  id,
  scanned_at,
  location,
  notes,
  scanned_by,
  equipment!inner (
    id,
    name,
    organization_id
  ),
  profiles:scanned_by (
    full_name
  )
`;

const OPERATOR_CHECKINS_TABLE_SELECT = `
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
  equipment!inner (
    id,
    name,
    serial_number,
    organization_id
  )
`;

const QUICK_FORMS_TABLE_SELECT = `
  id,
  submitted_at,
  form_snapshot,
  field_values,
  client_context,
  organization_id
`;

const ALTERNATE_GROUP_COLUMNS =
  "id, name, status, description, notes, organization_id";

const ALTERNATE_GROUP_MEMBERS_SELECT = `
  id,
  group_id,
  part_identifier_id,
  inventory_item_id,
  is_primary,
  notes,
  part_identifiers (
    identifier_type,
    raw_value,
    manufacturer
  ),
  inventory_items (
    name,
    sku,
    quantity_on_hand,
    low_stock_threshold,
    default_unit_cost,
    location
  )
`;

export interface FlattenedAlternateGroupMember {
  group_name: string;
  group_status: string;
  group_description: string | null;
  group_notes: string | null;
  member_type: string;
  is_primary: boolean;
  item_name: string | null;
  item_sku: string | null;
  quantity_on_hand: number;
  low_stock_threshold: number;
  default_unit_cost: number | null;
  location: string | null;
  identifier_type: string | null;
  identifier_value: string | null;
  identifier_manufacturer: string | null;
}

function resolveLimit(limit?: number): number {
  return limit ?? DEFAULT_MAX_REPORT_ROWS;
}

function applyRowPagination(
  query: ReportQueryBuilder,
  limit: number,
  offset?: number,
): ReportQueryBuilder {
  if (offset !== undefined && offset > 0) {
    return query.range(offset, offset + limit - 1);
  }
  return query.limit(limit);
}

async function fetchEquipmentRows(
  client: ReportDataClient,
  organizationId: string,
  filters: ReportExportFilters,
  columns: string[],
  limit: number,
  offset?: number,
): Promise<ExportRow[]> {
  if (client.rpc) {
    const { data, error } = await client.rpc("export_equipment_csv_rows", {
      p_organization_id: organizationId,
      p_columns: columns,
      p_status: filters.status ?? null,
      p_team_id: filters.teamId ?? null,
      p_location: filters.location ?? null,
      p_limit: limit,
    });

    if (!error) {
      return (Array.isArray(data) ? data : []) as ExportRow[];
    }

    console.warn("[reports/fetch-rows] equipment RPC unavailable, using table select", {
      message: error.message,
    });
  }

  let query = reportQuery(client, "equipment")
    .select(EQUIPMENT_TABLE_SELECT)
    .eq("organization_id", organizationId)
    .order("name");

  query = applyRowPagination(query, limit, offset);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.teamId) query = query.eq("team_id", filters.teamId);
  if (filters.location) query = query.ilike("location", `%${filters.location}%`);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch equipment: ${error.message}`);
  }

  return (data ?? []).map((item) => ({
    ...item,
    team_name: (item.teams as { name?: string } | null)?.name ?? "",
  })) as ExportRow[];
}

async function fetchWorkOrderRows(
  client: ReportDataClient,
  organizationId: string,
  filters: ReportExportFilters,
  columns: string[],
  accessibleTeamIds: string[] | undefined,
  limit: number,
  offset?: number,
): Promise<ExportRow[]> {
  if (accessibleTeamIds !== undefined && accessibleTeamIds.length === 0) {
    return [];
  }

  if (client.rpc) {
    const { data, error } = await client.rpc("export_work_orders_csv_rows", {
      p_organization_id: organizationId,
      p_columns: columns,
      p_status: filters.status ?? null,
      p_team_id: filters.teamId ?? null,
      p_priority: filters.priority ?? null,
      p_date_from: filters.dateRange?.from ?? null,
      p_date_to: filters.dateRange?.to ?? null,
      p_accessible_team_ids: accessibleTeamIds ?? null,
      p_limit: limit,
    });

    if (!error) {
      return (Array.isArray(data) ? data : []) as ExportRow[];
    }

    console.warn("[reports/fetch-rows] work-orders RPC unavailable, using table select", {
      message: error.message,
    });
  }

  let query = reportQuery(client, "work_orders")
    .select(WORK_ORDERS_TABLE_SELECT)
    .eq("organization_id", organizationId)
    .not("equipment_id", "is", null)
    .order("created_date", { ascending: false });

  query = applyRowPagination(query, limit, offset);

  if (accessibleTeamIds !== undefined) {
    query = query.in("team_id", accessibleTeamIds);
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.teamId) query = query.eq("team_id", filters.teamId);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.dateRange?.from) query = query.gte("created_date", filters.dateRange.from);
  if (filters.dateRange?.to) query = query.lte("created_date", filters.dateRange.to);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch work orders: ${error.message}`);
  }

  return (data ?? []).map((item) => ({
    ...item,
    team_name: (item.teams as { name?: string } | null)?.name ?? "",
    equipment_name: (item.equipment as { name?: string } | null)?.name ?? "",
  })) as ExportRow[];
}

async function fetchInventoryRows(
  client: ReportDataClient,
  organizationId: string,
  filters: ReportExportFilters,
  limit: number,
  offset?: number,
): Promise<ReportRow[]> {
  let query = reportQuery(client, "inventory_items")
    .select(INVENTORY_TABLE_SELECT)
    .eq("organization_id", organizationId)
    .order("name");

  query = applyRowPagination(query, limit, offset);

  if (filters.location) {
    query = query.ilike("location", `%${filters.location}%`);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch inventory: ${error.message}`);
  }

  return data ?? [];
}

async function fetchScanRows(
  client: ReportDataClient,
  organizationId: string,
  filters: ReportExportFilters,
  limit: number,
  offset?: number,
): Promise<ReportRow[]> {
  let query = reportQuery(client, "scans")
    .select(SCANS_TABLE_SELECT)
    .eq("equipment.organization_id", organizationId)
    .order("scanned_at", { ascending: false });

  query = applyRowPagination(query, limit, offset);

  if (filters.dateRange?.from) {
    query = query.gte("scanned_at", filters.dateRange.from);
  }
  if (filters.dateRange?.to) {
    query = query.lte("scanned_at", filters.dateRange.to);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch scans: ${error.message}`);
  }

  return data ?? [];
}

async function fetchOperatorCheckinRows(
  client: ReportDataClient,
  organizationId: string,
  filters: ReportExportFilters,
  limit: number,
  offset?: number,
): Promise<ReportRow[]> {
  let query = reportQuery(client, "operator_checkin_submissions")
    .select(OPERATOR_CHECKINS_TABLE_SELECT)
    .eq("organization_id", organizationId)
    .eq("equipment.organization_id", organizationId)
    .order("submitted_at", { ascending: false });

  query = applyRowPagination(query, limit, offset);

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

  return data ?? [];
}

async function fetchQuickFormRows(
  client: ReportDataClient,
  organizationId: string,
  filters: ReportExportFilters,
  limit: number,
  offset?: number,
): Promise<ReportRow[]> {
  let query = reportQuery(client, "quick_form_submissions")
    .select(QUICK_FORMS_TABLE_SELECT)
    .eq("organization_id", organizationId)
    .order("submitted_at", { ascending: false })
    .order("id", { ascending: false });

  query = applyRowPagination(query, limit, offset);

  if (filters.dateRange?.from) {
    query = query.gte("submitted_at", filters.dateRange.from);
  }
  if (filters.dateRange?.to) {
    query = query.lte("submitted_at", filters.dateRange.to);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch quick form submissions: ${error.message}`);
  }

  return data ?? [];
}

async function fetchAlternateGroupRows(
  client: ReportDataClient,
  organizationId: string,
  limit: number,
): Promise<FlattenedAlternateGroupMember[]> {
  const { data: groups, error: groupsError } = await reportQuery(client, "part_alternate_groups")
    .select(ALTERNATE_GROUP_COLUMNS)
    .eq("organization_id", organizationId)
    .order("name")
    .limit(limit);

  if (groupsError) {
    throw new Error(`Failed to fetch alternate groups: ${groupsError.message}`);
  }

  if (!groups || groups.length === 0) {
    return [];
  }

  const groupIds = groups.map((group) => group.id as string);

  const { data: members, error: membersError } = await reportQuery(client, "part_alternate_group_members")
    .select(ALTERNATE_GROUP_MEMBERS_SELECT)
    .in("group_id", groupIds)
    .order("group_id", { ascending: true })
    .order("is_primary", { ascending: false })
    .order("id", { ascending: true })
    .limit(limit);

  if (membersError) {
    throw new Error(`Failed to fetch group members: ${membersError.message}`);
  }

  if (!members || members.length === 0) {
    return [];
  }

  const groupMap = new Map(groups.map((group) => [group.id as string, group]));

  return members.map((member) => {
    const group = groupMap.get(member.group_id as string);
    const invItem = member.inventory_items as Record<string, unknown> | null;
    const partIdent = member.part_identifiers as Record<string, unknown> | null;

    return {
      group_name: (group?.name as string) ?? "",
      group_status: (group?.status as string) ?? "",
      group_description: (group?.description as string | null) ?? null,
      group_notes: (group?.notes as string | null) ?? null,
      member_type: member.inventory_item_id ? "Inventory Item" : "Part Identifier",
      is_primary: Boolean(member.is_primary),
      item_name: (invItem?.name as string) ?? null,
      item_sku: (invItem?.sku as string) ?? null,
      quantity_on_hand: (invItem?.quantity_on_hand as number) ?? 0,
      low_stock_threshold: (invItem?.low_stock_threshold as number) ?? 0,
      default_unit_cost: (invItem?.default_unit_cost as number) ?? null,
      location: (invItem?.location as string) ?? null,
      identifier_type: (partIdent?.identifier_type as string) ?? null,
      identifier_value: (partIdent?.raw_value as string) ?? null,
      identifier_manufacturer: (partIdent?.manufacturer as string) ?? null,
    };
  });
}

/**
 * Fetch shaped rows for a Fleet Export Console report type.
 * Applies server-side column whitelisting before RPC calls.
 * Table-select fallbacks honor optional `offset` + `limit` pagination; RPC paths use `limit` only.
 */
export async function fetchReportRows(
  client: ReportDataClient,
  params: FetchReportRowsParams,
): Promise<ReportRow[] | ExportRow[] | FlattenedAlternateGroupMember[]> {
  const {
    reportType,
    organizationId,
    filters,
    columns,
    accessibleTeamIds,
    limit,
    offset,
  } = params;
  const rowLimit = resolveLimit(limit);
  const allowedColumns = filterAllowedColumns(reportType, columns);

  switch (reportType) {
    case "equipment":
      return fetchEquipmentRows(client, organizationId, filters, allowedColumns, rowLimit, offset);
    case "work-orders":
      return fetchWorkOrderRows(
        client,
        organizationId,
        filters,
        allowedColumns,
        accessibleTeamIds,
        rowLimit,
        offset,
      );
    case "inventory":
      return fetchInventoryRows(client, organizationId, filters, rowLimit, offset);
    case "scans":
      return fetchScanRows(client, organizationId, filters, rowLimit, offset);
    case "operator-check-ins":
      return fetchOperatorCheckinRows(client, organizationId, filters, rowLimit, offset);
    case "quick-forms":
      return fetchQuickFormRows(client, organizationId, filters, rowLimit, offset);
    case "alternate-groups":
      // Two-query flatten shape: offset pagination is not supported (use limit-only bounded fetch).
      return fetchAlternateGroupRows(client, organizationId, rowLimit);
    default: {
      const _exhaustive: never = reportType;
      throw new Error(`Unsupported report type: ${_exhaustive}`);
    }
  }
}

export const __fetchRowsTestables = {
  EQUIPMENT_TABLE_SELECT,
  WORK_ORDERS_TABLE_SELECT,
  SCANS_TABLE_SELECT,
  OPERATOR_CHECKINS_TABLE_SELECT,
  QUICK_FORMS_TABLE_SELECT,
  ALTERNATE_GROUP_COLUMNS,
  resolveLimit,
  applyRowPagination,
};
