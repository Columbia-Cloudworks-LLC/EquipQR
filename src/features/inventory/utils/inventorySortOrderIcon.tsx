import {
  ArrowDown01,
  ArrowDownAZ,
  ArrowDownZA,
  ArrowUp01,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import type { InventorySortField } from '@/features/inventory/types/inventory';

const TEXT_SORT_FIELDS = new Set<InventorySortField>([
  'name',
  'sku',
  'external_id',
  'location',
]);

const NUMERIC_SORT_FIELDS = new Set<InventorySortField>(['quantity_on_hand']);

export function getInventorySortOrderLabel(
  sortBy: InventorySortField | undefined,
  sortOrder: 'asc' | 'desc',
): string {
  const ascending = sortOrder === 'asc';
  if (sortBy && TEXT_SORT_FIELDS.has(sortBy)) {
    return ascending ? 'A to Z, tap for Z to A' : 'Z to A, tap for A to Z';
  }
  if (sortBy && NUMERIC_SORT_FIELDS.has(sortBy)) {
    return ascending ? 'Low to high, tap for high to low' : 'High to low, tap for low to high';
  }
  return ascending ? 'Ascending order, tap for descending' : 'Descending order, tap for ascending';
}

interface InventorySortOrderIconProps {
  sortBy: InventorySortField | undefined;
  sortOrder: 'asc' | 'desc';
  className?: string;
}

export function InventorySortOrderIcon({
  sortBy,
  sortOrder,
  className = 'h-5 w-5',
}: InventorySortOrderIconProps) {
  const ascending = sortOrder === 'asc';

  if (sortBy && TEXT_SORT_FIELDS.has(sortBy)) {
    return ascending ? (
      <ArrowDownAZ className={className} aria-hidden />
    ) : (
      <ArrowDownZA className={className} aria-hidden />
    );
  }

  if (sortBy && NUMERIC_SORT_FIELDS.has(sortBy)) {
    return ascending ? (
      <ArrowDown01 className={className} aria-hidden />
    ) : (
      <ArrowUp01 className={className} aria-hidden />
    );
  }

  return ascending ? (
    <SortAsc className={className} aria-hidden />
  ) : (
    <SortDesc className={className} aria-hidden />
  );
}
