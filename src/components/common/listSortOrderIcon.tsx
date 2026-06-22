import {
  ArrowDown01,
  ArrowDownAZ,
  ArrowDownZA,
  ArrowUp01,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import type { ListSortFieldKind } from '@/components/common/listSortFieldKind';

interface ListSortOrderIconProps {
  kind: ListSortFieldKind;
  sortOrder: 'asc' | 'desc';
  className?: string;
}

export function ListSortOrderIcon({
  kind,
  sortOrder,
  className = 'h-5 w-5',
}: ListSortOrderIconProps) {
  const ascending = sortOrder === 'asc';

  if (kind === 'text') {
    return ascending ? (
      <ArrowDownAZ className={className} aria-hidden />
    ) : (
      <ArrowDownZA className={className} aria-hidden />
    );
  }

  if (kind === 'numeric') {
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
