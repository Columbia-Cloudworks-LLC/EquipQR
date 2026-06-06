import type { SortOption } from '@/components/common/ListSortPopover';

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
