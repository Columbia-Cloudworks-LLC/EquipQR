import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface MobileListGlanceCountProps {
  resultCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  singularLabel: string;
  pluralLabel: string;
  className?: string;
}

export const MobileListGlanceCount: React.FC<MobileListGlanceCountProps> = ({
  resultCount,
  totalCount,
  hasActiveFilters,
  singularLabel,
  pluralLabel,
  className,
}) => {
  const itemLabel = resultCount === 1 ? singularLabel : pluralLabel;

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2', className)}
      aria-live="polite"
      aria-atomic="false"
    >
      <div className="inline-flex items-baseline gap-1.5 rounded-md border border-border/80 bg-muted/30 px-3 py-1.5">
        <span className="text-lg font-semibold tabular-nums text-foreground">{resultCount}</span>
        <span className="text-sm font-medium text-muted-foreground">{itemLabel}</span>
        {hasActiveFilters && resultCount !== totalCount && (
          <span className="text-xs text-muted-foreground">of {totalCount}</span>
        )}
        {hasActiveFilters && (
          <Badge variant="secondary" className="ml-0.5 text-[10px] font-semibold uppercase tracking-wide">
            Filtered
          </Badge>
        )}
      </div>
    </div>
  );
};
