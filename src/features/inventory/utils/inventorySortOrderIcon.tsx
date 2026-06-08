import {
  ArrowDown01,
  ArrowDownAZ,
  ArrowDownZA,
  ArrowUp01,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import type { InventorySortField } from '@/features/inventory/types/inventory';
import {
  inventorySortOrderNumericFields,
  inventorySortOrderTextFields,
} from '@/features/inventory/utils/inventorySortOrderLabel';

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

  if (sortBy && inventorySortOrderTextFields.has(sortBy)) {
    return ascending ? (
      <ArrowDownAZ className={className} aria-hidden />
    ) : (
      <ArrowDownZA className={className} aria-hidden />
    );
  }

  if (sortBy && inventorySortOrderNumericFields.has(sortBy)) {
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
