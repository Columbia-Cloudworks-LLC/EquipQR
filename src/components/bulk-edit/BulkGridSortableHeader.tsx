import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface BulkGridSortableHeaderProps {
  column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: (desc?: boolean) => void };
  title: string;
  align?: 'left' | 'right';
  /** When true, button stretches full column width (inventory virtualized header). */
  fullWidth?: boolean;
}

export const BulkGridSortableHeader: React.FC<BulkGridSortableHeaderProps> = ({
  column,
  title,
  align = 'left',
  fullWidth = false,
}) => {
  const sorted = column.getIsSorted();
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className={cn(
        'h-7 px-1 text-xs font-medium',
        fullWidth && 'w-full',
        fullWidth
          ? align === 'right'
            ? 'justify-end'
            : 'justify-start'
          : align === 'right' && 'ml-auto'
      )}
    >
      {title}
      <Icon className="ml-1 h-3 w-3 shrink-0" aria-hidden />
    </Button>
  );
};
