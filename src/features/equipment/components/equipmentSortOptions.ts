import type { SortOption } from '@/components/common/ListSortPopover';
import type { ListSortFieldKind } from '@/components/common/listSortFieldKind';

export type EquipmentSortFieldOption = {
  value: string;
  label: string;
  kind: ListSortFieldKind;
  defaultOrder: 'asc' | 'desc';
};

/** Field-only options for mobile Personalize list (direction is toggled separately). */
export const EQUIPMENT_SORT_FIELD_OPTIONS: EquipmentSortFieldOption[] = [
  { value: 'name', label: 'Name', kind: 'text', defaultOrder: 'asc' },
  { value: 'working_hours', label: 'Hours', kind: 'numeric', defaultOrder: 'desc' },
  { value: 'last_maintenance', label: 'Last Maintenance', kind: 'default', defaultOrder: 'desc' },
  { value: 'updated_at', label: 'Last Updated', kind: 'default', defaultOrder: 'desc' },
  { value: 'status', label: 'Status', kind: 'default', defaultOrder: 'asc' },
  { value: 'location', label: 'Location', kind: 'text', defaultOrder: 'asc' },
  { value: 'manufacturer', label: 'Manufacturer', kind: 'text', defaultOrder: 'asc' },
  { value: 'created_at', label: 'Created Date', kind: 'default', defaultOrder: 'desc' },
  { value: 'warranty_expiration', label: 'Warranty Expiration', kind: 'default', defaultOrder: 'asc' },
];

/** Composite options for desktop sort popover / select. */
export const EQUIPMENT_SORT_OPTIONS: SortOption[] = [
  { value: 'name:asc', label: 'Name (A–Z)' },
  { value: 'name:desc', label: 'Name (Z–A)' },
  { value: 'working_hours:desc', label: 'Hours (High–Low)' },
  { value: 'working_hours:asc', label: 'Hours (Low–High)' },
  { value: 'last_maintenance:desc', label: 'Last Maintenance' },
  { value: 'updated_at:desc', label: 'Last Updated' },
  { value: 'status:asc', label: 'Status' },
  { value: 'location:asc', label: 'Location (A–Z)' },
  { value: 'manufacturer:asc', label: 'Manufacturer (A–Z)' },
  { value: 'created_at:desc', label: 'Recently Added' },
  { value: 'warranty_expiration:asc', label: 'Warranty Expiration' },
];

export function equipmentSortLabel(
  sortOptions: SortOption[],
  compositeValue: string,
  field: string,
): string {
  return (
    sortOptions.find((o) => o.value === compositeValue)?.label ??
    sortOptions.find((o) => o.value.startsWith(`${field}:`))?.label ??
    field
  );
}

export function getEquipmentSortFieldDefaultOrder(field: string): 'asc' | 'desc' {
  return (
    EQUIPMENT_SORT_FIELD_OPTIONS.find((option) => option.value === field)?.defaultOrder ?? 'asc'
  );
}
