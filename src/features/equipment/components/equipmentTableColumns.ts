export type EquipmentTableColumnKey =
  | 'name'
  | 'status'
  | 'manufacturer'
  | 'model'
  | 'serial_number'
  | 'working_hours'
  | 'location'
  | 'team_name'
  | 'last_maintenance';

export type EquipmentTableSortField = EquipmentTableColumnKey;

export interface EquipmentTableColumnMeta {
  key: EquipmentTableColumnKey;
  sortField: EquipmentTableSortField;
  title: string;
  /** When false, the column-picker UI disables the toggle (the column is structural). */
  canHide: boolean;
  /** Initial visibility used by `useEquipmentTableColumns` and the "Reset to defaults" action. */
  defaultVisible: boolean;
  defaultWidth: number;
  minWidth: number;
  maxWidth?: number;
  align?: 'left' | 'right' | 'center';
  mono?: boolean;
  sortable: boolean;
  resizable: boolean;
}

export const EQUIPMENT_TABLE_COLUMN_ORDER: readonly EquipmentTableColumnKey[] = [
  'status',
  'name',
  'manufacturer',
  'model',
  'serial_number',
  'working_hours',
  'location',
  'team_name',
  'last_maintenance',
] as const;

/**
 * Public metadata for every togglable column in the dense equipment table.
 *
 * Width, resize, and sort behavior mirror `AlternateGroupsDesktopTable`; cell
 * renderers live in `EquipmentTable` because they close over navigation hooks.
 */
export const EQUIPMENT_TABLE_COLUMN_META: readonly EquipmentTableColumnMeta[] = [
  {
    key: 'status',
    sortField: 'status',
    title: 'Status',
    canHide: false,
    defaultVisible: true,
    defaultWidth: 48,
    minWidth: 48,
    maxWidth: 48,
    align: 'center',
    sortable: true,
    resizable: false,
  },
  {
    key: 'name',
    sortField: 'name',
    title: 'Name',
    canHide: false,
    defaultVisible: true,
    defaultWidth: 240,
    minWidth: 140,
    maxWidth: 420,
    sortable: true,
    resizable: true,
  },
  {
    key: 'manufacturer',
    sortField: 'manufacturer',
    title: 'Manufacturer',
    canHide: true,
    defaultVisible: true,
    defaultWidth: 160,
    minWidth: 100,
    maxWidth: 280,
    sortable: true,
    resizable: true,
  },
  {
    key: 'model',
    sortField: 'model',
    title: 'Model',
    canHide: true,
    defaultVisible: true,
    defaultWidth: 160,
    minWidth: 100,
    maxWidth: 280,
    sortable: true,
    resizable: true,
  },
  {
    key: 'serial_number',
    sortField: 'serial_number',
    title: 'Serial #',
    canHide: true,
    defaultVisible: true,
    defaultWidth: 160,
    minWidth: 100,
    maxWidth: 320,
    mono: true,
    sortable: true,
    resizable: true,
  },
  {
    key: 'working_hours',
    sortField: 'working_hours',
    title: 'Hours',
    canHide: true,
    defaultVisible: true,
    defaultWidth: 96,
    minWidth: 72,
    maxWidth: 140,
    align: 'right',
    mono: true,
    sortable: true,
    resizable: true,
  },
  {
    key: 'location',
    sortField: 'location',
    title: 'Location',
    canHide: true,
    defaultVisible: true,
    defaultWidth: 180,
    minWidth: 100,
    maxWidth: 320,
    sortable: true,
    resizable: true,
  },
  {
    key: 'team_name',
    sortField: 'team_name',
    title: 'Team',
    canHide: true,
    defaultVisible: true,
    defaultWidth: 160,
    minWidth: 100,
    maxWidth: 280,
    sortable: true,
    resizable: true,
  },
  {
    key: 'last_maintenance',
    sortField: 'last_maintenance',
    title: 'Last Maintenance',
    canHide: true,
    defaultVisible: false,
    defaultWidth: 160,
    minWidth: 120,
    maxWidth: 240,
    align: 'right',
    mono: true,
    sortable: true,
    resizable: true,
  },
] as const;

export const EQUIPMENT_TABLE_ACTIONS_COLUMN_KEY = '__actions' as const;

export const DEFAULT_VISIBLE_COLUMNS: Record<string, boolean> = Object.fromEntries(
  EQUIPMENT_TABLE_COLUMN_META.map((c) => [c.key, c.defaultVisible]),
);

export function getDefaultEquipmentColumnSizing(): Record<string, number> {
  return {
    ...Object.fromEntries(
      EQUIPMENT_TABLE_COLUMN_META.map((column) => [column.key, column.defaultWidth]),
    ),
    [EQUIPMENT_TABLE_ACTIONS_COLUMN_KEY]: 56,
  };
}

export function getEquipmentTableColumnMeta(
  key: EquipmentTableColumnKey,
): EquipmentTableColumnMeta | undefined {
  return EQUIPMENT_TABLE_COLUMN_META.find((column) => column.key === key);
}
