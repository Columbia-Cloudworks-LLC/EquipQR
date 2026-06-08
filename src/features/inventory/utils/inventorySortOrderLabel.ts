import type { InventorySortField } from '@/features/inventory/types/inventory';

const TEXT_SORT_FIELDS = new Set<InventorySortField>([
  'name',
  'sku',
  'external_id',
  'location',
]);

const NUMERIC_SORT_FIELDS = new Set<InventorySortField>(['quantity_on_hand']);

export function isTextSortField(
  sortBy: InventorySortField | undefined,
): sortBy is InventorySortField {
  return sortBy !== undefined && TEXT_SORT_FIELDS.has(sortBy);
}

export function isNumericSortField(
  sortBy: InventorySortField | undefined,
): sortBy is InventorySortField {
  return sortBy !== undefined && NUMERIC_SORT_FIELDS.has(sortBy);
}

export function getInventorySortOrderLabel(
  sortBy: InventorySortField | undefined,
  sortOrder: 'asc' | 'desc',
): string {
  const ascending = sortOrder === 'asc';
  if (isTextSortField(sortBy)) {
    return ascending ? 'A to Z, tap for Z to A' : 'Z to A, tap for A to Z';
  }
  if (isNumericSortField(sortBy)) {
    return ascending ? 'Low to high, tap for high to low' : 'High to low, tap for low to high';
  }
  return ascending ? 'Ascending order, tap for descending' : 'Descending order, tap for ascending';
}
