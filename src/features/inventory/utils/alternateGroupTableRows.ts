import type { AlternateGroupTableSortField } from '@/features/inventory/components/alternateGroupTableColumns';
import type {
  AlternateGroupMemberDetail,
  AlternateGroupTableRow,
  PartAlternateGroup,
  VerificationStatus,
} from '@/features/inventory/types/inventory';

const STATUS_SORT_ORDER: Record<VerificationStatus, number> = {
  verified: 0,
  unverified: 1,
  deprecated: 2,
};

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
}

function compareNullableStrings(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return compareStrings(a, b);
}

function compareNullableNumbers(a: number | null, b: number | null): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

function lowStockSortRank(value: boolean | null): number {
  if (value == null) return 2;
  return value ? 0 : 1;
}

function formatUnitCostDisplay(value: number | null): string {
  if (value == null) return '—';
  return `$${Number(value).toFixed(2)}`;
}

function formatLowStockDisplay(
  quantityOnHand: number | null,
  lowStockThreshold: number | null,
): string {
  const isLowStock = isAlternateGroupMemberLowStock(quantityOnHand, lowStockThreshold);
  if (isLowStock == null) return '—';
  return isLowStock ? 'Yes' : 'No';
}

export function memberDetailMatchesSearch(
  member: AlternateGroupMemberDetail,
  needle: string,
): boolean {
  const values = [
    member.item_name,
    member.item_sku,
    member.location,
    member.identifier_value,
    member.identifier_manufacturer,
    member.identifier_type,
  ];

  return values.some((value) => value?.toLowerCase().includes(needle));
}

export function groupMatchesSearch(group: PartAlternateGroup, needle: string): boolean {
  if (group.name.toLowerCase().includes(needle)) return true;
  if (group.description?.toLowerCase().includes(needle)) return true;

  return (group.member_details ?? []).some((member) => memberDetailMatchesSearch(member, needle));
}

export function flattenAlternateGroupsToTableRows(
  groups: PartAlternateGroup[],
): AlternateGroupTableRow[] {
  return groups.flatMap((group) =>
    (group.member_details ?? []).map((member) => ({
      row_id: `${group.id}-${member.id}`,
      group_id: group.id,
      group_name: group.name,
      group_status: group.status,
      member_id: member.id,
      is_primary: member.is_primary,
      member_type: member.member_type,
      inventory_item_id: member.inventory_item_id,
      item_name: member.item_name,
      item_sku: member.item_sku,
      quantity_on_hand: member.quantity_on_hand,
      low_stock_threshold: member.low_stock_threshold,
      default_unit_cost: member.default_unit_cost,
      location: member.location,
      identifier_type: member.identifier_type,
      identifier_value: member.identifier_value,
      identifier_manufacturer: member.identifier_manufacturer,
    })),
  );
}

export function filterAlternateGroupTableRows(
  rows: AlternateGroupTableRow[],
  search: string,
): AlternateGroupTableRow[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return rows;

  return rows.filter((row) => {
    if (row.group_name.toLowerCase().includes(needle)) return true;

    const values = [
      row.item_name,
      row.item_sku,
      row.location,
      row.identifier_value,
      row.identifier_manufacturer,
      row.identifier_type,
    ];

    return values.some((value) => value?.toLowerCase().includes(needle));
  });
}

export function isAlternateGroupMemberLowStock(
  quantityOnHand: number | null,
  lowStockThreshold: number | null,
): boolean | null {
  if (quantityOnHand == null || lowStockThreshold == null) return null;
  return quantityOnHand <= lowStockThreshold;
}

export function getAlternateGroupTableCellDisplayValue(
  row: AlternateGroupTableRow,
  sortField: AlternateGroupTableSortField,
): string {
  switch (sortField) {
    case 'group_status':
      return row.group_status;
    case 'group_name':
      return row.group_name;
    case 'identifier_manufacturer':
      return row.identifier_manufacturer ?? '—';
    case 'item_name':
      return row.item_name ?? '—';
    case 'identifier_value':
      return row.identifier_value ?? '—';
    case 'item_sku':
      return row.item_sku ?? '—';
    case 'default_unit_cost':
      return formatUnitCostDisplay(row.default_unit_cost);
    case 'quantity_on_hand':
      return row.quantity_on_hand != null ? String(row.quantity_on_hand) : '—';
    case 'low_stock':
      return formatLowStockDisplay(row.quantity_on_hand, row.low_stock_threshold);
    case 'location':
      return row.location ?? '—';
    default: {
      const exhaustive: never = sortField;
      return exhaustive;
    }
  }
}

export function sortAlternateGroupTableRows(
  rows: AlternateGroupTableRow[],
  sortBy: AlternateGroupTableSortField,
  sortOrder: 'asc' | 'desc',
): AlternateGroupTableRow[] {
  const direction = sortOrder === 'asc' ? 1 : -1;
  const sorted = [...rows];

  sorted.sort((left, right) => {
    let comparison: number;

    switch (sortBy) {
      case 'group_status':
        comparison = STATUS_SORT_ORDER[left.group_status] - STATUS_SORT_ORDER[right.group_status];
        break;
      case 'group_name':
        comparison = compareStrings(left.group_name, right.group_name);
        break;
      case 'identifier_manufacturer':
        comparison = compareNullableStrings(
          left.identifier_manufacturer,
          right.identifier_manufacturer,
        );
        break;
      case 'item_name':
        comparison = compareNullableStrings(left.item_name, right.item_name);
        break;
      case 'identifier_value':
        comparison = compareNullableStrings(left.identifier_value, right.identifier_value);
        break;
      case 'item_sku':
        comparison = compareNullableStrings(left.item_sku, right.item_sku);
        break;
      case 'default_unit_cost':
        comparison = compareNullableNumbers(left.default_unit_cost, right.default_unit_cost);
        break;
      case 'quantity_on_hand':
        comparison = compareNullableNumbers(left.quantity_on_hand, right.quantity_on_hand);
        break;
      case 'low_stock':
        comparison =
          lowStockSortRank(
            isAlternateGroupMemberLowStock(left.quantity_on_hand, left.low_stock_threshold),
          ) -
          lowStockSortRank(
            isAlternateGroupMemberLowStock(right.quantity_on_hand, right.low_stock_threshold),
          );
        break;
      case 'location':
        comparison = compareNullableStrings(left.location, right.location);
        break;
      default: {
        const exhaustive: never = sortBy;
        return exhaustive;
      }
    }

    if (comparison === 0) {
      comparison = compareStrings(left.group_name, right.group_name);
    }
    if (comparison === 0) {
      comparison = compareNullableStrings(left.item_name, right.item_name);
    }
    if (comparison === 0) {
      comparison = compareNullableStrings(left.identifier_value, right.identifier_value);
    }

    return comparison * direction;
  });

  return sorted;
}
