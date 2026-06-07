/**
 * Alternate part groups CSV export.
 */

import { buildCsvTable, escapeCSVValue } from "../_shared/csv-export.ts";
import type { ExportFilters, ExportResult, UserSupabaseClient } from "./rate-limit.ts";
import { MAX_ROWS } from "./rate-limit.ts";
import { computeIsLowStock, formatUnitCost } from "./inventory-csv-export.ts";

export function formatPrimaryFlag(isPrimary: boolean): string {
  return isPrimary ? "Yes" : "No";
}

export function resolveMemberType(inventoryItemId: string | null): string {
  return inventoryItemId ? "Inventory Item" : "Part Identifier";
}

export interface FlattenedMember {
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

export async function exportAlternateGroups(
  supabase: UserSupabaseClient,
  organizationId: string,
  _filters: ExportFilters,
  columns: string[],
): Promise<ExportResult> {
  const { data: groups, error: groupsError } = await supabase
    .from("part_alternate_groups")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name")
    .limit(MAX_ROWS);

  if (groupsError) {
    throw new Error(`Failed to fetch alternate groups: ${groupsError.message}`);
  }

  if (!groups || groups.length === 0) {
    return { csvContent: "No data found", rowCount: 0 };
  }

  const groupIds = groups.map((g) => g.id);

  const { data: members, error: membersError } = await supabase
    .from("part_alternate_group_members")
    .select(`
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
    `)
    .in("group_id", groupIds)
    .order("is_primary", { ascending: false })
    .limit(MAX_ROWS);

  if (membersError) {
    throw new Error(`Failed to fetch group members: ${membersError.message}`);
  }

  if (!members || members.length === 0) {
    return { csvContent: "No data found", rowCount: 0 };
  }

  const groupMap = new Map(groups.map((g) => [g.id, g]));

  const flattenedMembers: FlattenedMember[] = members.map((member) => {
    const group = groupMap.get(member.group_id);
    const invItem = member.inventory_items as unknown as Record<string, unknown> | null;
    const partIdent = member.part_identifiers as unknown as Record<string, unknown> | null;

    return {
      group_name: group?.name ?? "",
      group_status: group?.status ?? "",
      group_description: group?.description ?? null,
      group_notes: group?.notes ?? null,
      member_type: resolveMemberType(member.inventory_item_id),
      is_primary: member.is_primary,
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

  const columnMap: Record<string, (item: FlattenedMember) => string> = {
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

  const columnLabels: Record<string, string> = {
    group_name: "Group Name",
    group_status: "Verification Status",
    group_description: "Description",
    member_type: "Member Type",
    is_primary: "Primary Part",
    item_name: "Item Name",
    item_sku: "SKU",
    quantity_on_hand: "Quantity",
    is_low_stock: "Low Stock",
    default_unit_cost: "Unit Cost",
    location: "Location",
    identifier_type: "Identifier Type",
    identifier_value: "Part Number",
    identifier_manufacturer: "Part Manufacturer",
    group_notes: "Notes",
  };

  return {
    csvContent: buildCsvTable(flattenedMembers, columns, columnMap, columnLabels),
    rowCount: flattenedMembers.length,
  };
}

export const __alternateGroupsCsvTestables = {
  formatPrimaryFlag,
  resolveMemberType,
};
