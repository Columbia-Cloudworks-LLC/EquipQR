import type { ListSortFieldKind } from '@/components/common/listSortFieldKind';

export function getListSortOrderLabel(
  kind: ListSortFieldKind,
  sortOrder: 'asc' | 'desc',
): string {
  const ascending = sortOrder === 'asc';

  if (kind === 'text') {
    return ascending ? 'A to Z, tap for Z to A' : 'Z to A, tap for A to Z';
  }

  if (kind === 'numeric') {
    return ascending
      ? 'Low to high, tap for high to low'
      : 'High to low, tap for low to high';
  }

  return ascending
    ? 'Ascending order, tap for descending'
    : 'Descending order, tap for ascending';
}
