import React from 'react';
import { LayoutGrid, Rows3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type GridTableViewModeToggleProps<T extends string> = {
  viewMode: T;
  onViewModeChange: (mode: T) => void;
  gridValue: T;
  tableValue: T;
  gridAriaLabel?: string;
};

export function GridTableViewModeToggle<T extends string>({
  viewMode,
  onViewModeChange,
  gridValue,
  tableValue,
  gridAriaLabel = 'Card view',
}: GridTableViewModeToggleProps<T>) {
  return (
    <div
      className="hidden md:flex items-center rounded-md border"
      role="radiogroup"
      aria-label="View mode"
    >
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8 rounded-r-none', viewMode === gridValue && 'bg-muted')}
        onClick={() => onViewModeChange(gridValue)}
        aria-label={gridAriaLabel}
        aria-checked={viewMode === gridValue}
        role="radio"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8 rounded-l-none', viewMode === tableValue && 'bg-muted')}
        onClick={() => onViewModeChange(tableValue)}
        aria-label="Table view"
        aria-checked={viewMode === tableValue}
        role="radio"
      >
        <Rows3 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
