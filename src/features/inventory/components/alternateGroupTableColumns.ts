export type AlternateGroupTableColumnKey =
  | 'verified'
  | 'group_name'
  | 'identifier_manufacturer'
  | 'item_name'
  | 'identifier_value'
  | 'item_sku'
  | 'default_unit_cost'
  | 'quantity_on_hand'
  | 'low_stock'
  | 'location';

/** Sortable fields mirror column keys except the verified status dot column. */
export type AlternateGroupTableSortField = Exclude<AlternateGroupTableColumnKey, 'verified'> | 'group_status';

export interface AlternateGroupTableColumnMeta {
  key: AlternateGroupTableColumnKey;
  sortField: AlternateGroupTableSortField;
  title: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth?: number;
  align?: 'left' | 'right' | 'center';
  mono?: boolean;
  sortable: boolean;
  resizable: boolean;
}

export const ALTERNATE_GROUP_TABLE_COLUMN_ORDER: readonly AlternateGroupTableColumnKey[] = [
  'verified',
  'group_name',
  'identifier_manufacturer',
  'item_name',
  'identifier_value',
  'item_sku',
  'default_unit_cost',
  'quantity_on_hand',
  'low_stock',
  'location',
] as const;

export const ALTERNATE_GROUP_TABLE_COLUMN_META: readonly AlternateGroupTableColumnMeta[] = [
  {
    key: 'verified',
    sortField: 'group_status',
    title: 'Verified',
    defaultWidth: 48,
    minWidth: 48,
    maxWidth: 48,
    align: 'center',
    sortable: true,
    resizable: false,
  },
  {
    key: 'group_name',
    sortField: 'group_name',
    title: 'Alternate Group',
    defaultWidth: 200,
    minWidth: 120,
    maxWidth: 400,
    sortable: true,
    resizable: true,
  },
  {
    key: 'identifier_manufacturer',
    sortField: 'identifier_manufacturer',
    title: 'Manufacturer',
    defaultWidth: 130,
    minWidth: 80,
    maxWidth: 240,
    sortable: true,
    resizable: true,
  },
  {
    key: 'item_name',
    sortField: 'item_name',
    title: 'Item Name',
    defaultWidth: 160,
    minWidth: 100,
    maxWidth: 320,
    sortable: true,
    resizable: true,
  },
  {
    key: 'identifier_value',
    sortField: 'identifier_value',
    title: 'Part Number',
    defaultWidth: 160,
    minWidth: 100,
    maxWidth: 360,
    mono: true,
    sortable: true,
    resizable: true,
  },
  {
    key: 'item_sku',
    sortField: 'item_sku',
    title: 'SKU',
    defaultWidth: 110,
    minWidth: 80,
    maxWidth: 200,
    mono: true,
    sortable: true,
    resizable: true,
  },
  {
    key: 'default_unit_cost',
    sortField: 'default_unit_cost',
    title: 'Unit Cost',
    defaultWidth: 96,
    minWidth: 72,
    maxWidth: 140,
    align: 'right',
    mono: true,
    sortable: true,
    resizable: true,
  },
  {
    key: 'quantity_on_hand',
    sortField: 'quantity_on_hand',
    title: 'Qty',
    defaultWidth: 72,
    minWidth: 56,
    maxWidth: 120,
    align: 'right',
    mono: true,
    sortable: true,
    resizable: true,
  },
  {
    key: 'low_stock',
    sortField: 'low_stock',
    title: 'Low Stock',
    defaultWidth: 96,
    minWidth: 72,
    maxWidth: 140,
    sortable: true,
    resizable: true,
  },
  {
    key: 'location',
    sortField: 'location',
    title: 'Location',
    defaultWidth: 140,
    minWidth: 90,
    maxWidth: 280,
    sortable: true,
    resizable: true,
  },
] as const;

export function getDefaultAlternateGroupColumnSizing(): Record<string, number> {
  return Object.fromEntries(
    ALTERNATE_GROUP_TABLE_COLUMN_META.map((column) => [column.key, column.defaultWidth]),
  );
}

export function getAlternateGroupTableColumnMeta(
  key: AlternateGroupTableColumnKey,
): AlternateGroupTableColumnMeta | undefined {
  return ALTERNATE_GROUP_TABLE_COLUMN_META.find((column) => column.key === key);
}
