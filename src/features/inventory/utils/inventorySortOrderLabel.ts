import type { InventorySortField } from '@/features/inventory/types/inventory';
import type { ListSortFieldKind } from '@/components/common/listSortFieldKind';
import { getListSortOrderLabel } from '@/components/common/listSortOrderLabel';

const TEXT_SORT_FIELDS = new Set<InventorySortField>([
  'name',
  'sku',
  'external_id',
  'location',
]);

const NUMERIC_SORT_FIELDS = new Set<InventorySortField>(['quantity_on_hand']);

function getInventorySortFieldKind(
  sortBy: InventorySortField | undefined,
): ListSortFieldKind {
  if (sortBy !== undefined && TEXT_SORT_FIELDS.has(sortBy)) {
    return 'text';
  }
  if (sortBy !== undefined && NUMERIC_SORT_FIELDS.has(sortBy)) {
    return 'numeric';
  }
  return 'default';
}

export function getInventorySortOrderLabel(
  sortBy: InventorySortField | undefined,
  sortOrder: 'asc' | 'desc',
): string {
  return getListSortOrderLabel(getInventorySortFieldKind(sortBy), sortOrder);
}
