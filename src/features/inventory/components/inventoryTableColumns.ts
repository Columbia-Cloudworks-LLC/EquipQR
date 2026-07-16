export type InventoryTableColumnKey =
  | 'name'
  | 'sku'
  | 'external_id'
  | 'quantity_on_hand'
  | 'low_stock_threshold'
  | 'location'
  | 'default_unit_cost'
  | 'status'
  | 'alternate_groups'
  | 'description'
  | 'created_at'
  | 'updated_at'
  | 'last_adjusted_at';

export interface InventoryTableColumnMeta {
  key: InventoryTableColumnKey;
  title: string;
  canHide: boolean;
  defaultVisible: boolean;
  defaultWidth: number;
  minWidth: number;
  maxWidth?: number;
  align?: 'left' | 'right' | 'center';
  mono?: boolean;
  sortable: boolean;
  description?: string;
}

export const INVENTORY_TABLE_COLUMN_META: readonly InventoryTableColumnMeta[] = [
  {
    key: 'name',
    title: 'Name',
    canHide: false,
    defaultVisible: true,
    defaultWidth: 240,
    minWidth: 160,
    maxWidth: 400,
    sortable: true,
  },
  {
    key: 'sku',
    title: 'SKU',
    canHide: true,
    defaultVisible: true,
    defaultWidth: 120,
    minWidth: 80,
    maxWidth: 200,
    mono: true,
    sortable: true,
  },
  {
    key: 'external_id',
    title: 'External ID',
    canHide: true,
    defaultVisible: false,
    defaultWidth: 130,
    minWidth: 90,
    maxWidth: 200,
    mono: true,
    sortable: true,
  },
  {
    key: 'quantity_on_hand',
    title: 'Quantity',
    canHide: true,
    defaultVisible: true,
    defaultWidth: 140,
    minWidth: 100,
    maxWidth: 200,
    align: 'right',
    mono: true,
    sortable: true,
  },
  {
    key: 'low_stock_threshold',
    title: 'Low Stock Threshold',
    canHide: true,
    defaultVisible: false,
    defaultWidth: 130,
    minWidth: 90,
    maxWidth: 180,
    align: 'right',
    mono: true,
    sortable: true,
  },
  {
    key: 'location',
    title: 'Location Name',
    canHide: true,
    defaultVisible: true,
    defaultWidth: 160,
    minWidth: 100,
    maxWidth: 280,
    sortable: true,
  },
  {
    key: 'default_unit_cost',
    title: 'Unit Cost',
    canHide: true,
    defaultVisible: false,
    defaultWidth: 110,
    minWidth: 80,
    maxWidth: 160,
    align: 'right',
    mono: true,
    sortable: true,
  },
  {
    key: 'status',
    title: 'Status',
    canHide: true,
    defaultVisible: true,
    defaultWidth: 130,
    minWidth: 100,
    maxWidth: 180,
    sortable: true,
  },
  {
    key: 'alternate_groups',
    title: 'Alternate Groups',
    canHide: true,
    defaultVisible: false,
    defaultWidth: 140,
    minWidth: 100,
    maxWidth: 200,
    align: 'right',
    mono: true,
    sortable: true,
  },
  {
    key: 'description',
    title: 'Description',
    canHide: true,
    defaultVisible: false,
    defaultWidth: 200,
    minWidth: 120,
    maxWidth: 400,
    sortable: false,
  },
  {
    key: 'created_at',
    title: 'Created',
    canHide: true,
    defaultVisible: false,
    defaultWidth: 120,
    minWidth: 90,
    maxWidth: 180,
    align: 'right',
    mono: true,
    sortable: true,
  },
  {
    key: 'updated_at',
    title: 'Updated',
    canHide: true,
    defaultVisible: false,
    defaultWidth: 120,
    minWidth: 90,
    maxWidth: 180,
    align: 'right',
    mono: true,
    sortable: true,
  },
  {
    key: 'last_adjusted_at',
    title: 'Last Adjusted',
    canHide: true,
    defaultVisible: false,
    defaultWidth: 130,
    minWidth: 100,
    maxWidth: 180,
    align: 'right',
    mono: true,
    sortable: true,
    description: 'Most recent stock adjustment',
  },
] as const;

export const DEFAULT_COLUMN_VISIBILITY: Record<InventoryTableColumnKey, boolean> =
  Object.fromEntries(
    INVENTORY_TABLE_COLUMN_META.map((c) => [c.key, c.defaultVisible]),
  ) as Record<InventoryTableColumnKey, boolean>;

export const DEFAULT_COLUMN_ORDER: InventoryTableColumnKey[] =
  INVENTORY_TABLE_COLUMN_META.map((c) => c.key);

export const DEFAULT_COLUMN_SIZING: Record<string, number> = Object.fromEntries(
  INVENTORY_TABLE_COLUMN_META.map((c) => [c.key, c.defaultWidth]),
);
