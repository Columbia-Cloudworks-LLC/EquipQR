export interface EquipmentTableColumnMeta {
  key: string;
  title: string;
  /** When false, the column-picker UI disables the toggle (the column is structural). */
  canHide: boolean;
  /** Initial visibility used by `useEquipmentTableColumns` and the "Reset to defaults" action. */
  defaultVisible: boolean;
}

/**
 * Public metadata for every togglable column in the dense equipment table.
 *
 * The full column definitions (render functions, widths, mono, sortable) live
 * inside the component because they close over `navigate` and `onShowQRCode`.
 * This module-scoped array exists so the column-picker UI and the persistence
 * hook can reason about the available columns without depending on the table
 * implementation.
 */
export const EQUIPMENT_TABLE_COLUMN_META: readonly EquipmentTableColumnMeta[] = [
  { key: 'name',             title: 'Name',             canHide: false, defaultVisible: true },
  { key: 'status',           title: 'Status',           canHide: true,  defaultVisible: true },
  { key: 'manufacturer',     title: 'Manufacturer',     canHide: true,  defaultVisible: true },
  { key: 'model',            title: 'Model',            canHide: true,  defaultVisible: true },
  { key: 'serial_number',    title: 'Serial #',         canHide: true,  defaultVisible: true },
  { key: 'working_hours',    title: 'Hours',            canHide: true,  defaultVisible: true },
  { key: 'location',         title: 'Location',         canHide: true,  defaultVisible: true },
  { key: 'team_name',        title: 'Team',             canHide: true,  defaultVisible: true },
  { key: 'last_maintenance', title: 'Last Maintenance', canHide: true,  defaultVisible: false },
] as const;

export const DEFAULT_VISIBLE_COLUMNS: Record<string, boolean> = Object.fromEntries(
  EQUIPMENT_TABLE_COLUMN_META.map((c) => [c.key, c.defaultVisible]),
);
