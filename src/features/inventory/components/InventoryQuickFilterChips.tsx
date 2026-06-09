import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { InventoryQuickFilterKey } from '@/features/inventory/types/inventory';
import { QUICK_FILTER_LABELS } from '@/features/inventory/utils/inventoryQuickFilters';
import { cn } from '@/lib/utils';

type InventoryQuickFilterChipsProps = {
  activeQuickFilters: InventoryQuickFilterKey[];
  counts: Partial<Record<InventoryQuickFilterKey, number>>;
  onToggle: (filter: InventoryQuickFilterKey) => void;
  onClear: () => void;
  className?: string;
};

const DESKTOP_QUICK_FILTERS: InventoryQuickFilterKey[] = [
  'low-stock',
  'out-of-stock',
  'negative-stock',
  'reorder-needed',
  'has-alternates',
  'missing-data',
  'recently-adjusted',
];

export function InventoryQuickFilterChips({
  activeQuickFilters,
  counts,
  onToggle,
  onClear,
  className,
}: InventoryQuickFilterChipsProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <span className="text-xs text-muted-foreground">Quick filters:</span>
      {DESKTOP_QUICK_FILTERS.map((filter) => {
        const active = activeQuickFilters.includes(filter);
        const count = counts[filter];
        return (
          <button
            key={filter}
            type="button"
            onClick={() => onToggle(filter)}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
            aria-pressed={active}
            aria-label={`${QUICK_FILTER_LABELS[filter]}${count != null ? `, ${count} items` : ''}`}
          >
            <Badge
              variant={active ? 'default' : 'secondary'}
              className="cursor-pointer text-xs h-6 px-2"
            >
              {QUICK_FILTER_LABELS[filter]}
              {count != null && count > 0 ? ` (${count})` : ''}
            </Badge>
          </button>
        );
      })}
      {activeQuickFilters.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground"
          onClick={onClear}
        >
          <X className="mr-1 h-3 w-3" aria-hidden />
          Clear quick filters
        </Button>
      )}
    </div>
  );
}
