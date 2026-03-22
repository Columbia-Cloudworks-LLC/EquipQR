import React from 'react';
import { Search, X, MapPin, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import InventoryFilterPopover from './InventoryFilterPopover';
import type { InventoryFilters } from '@/features/inventory/types/inventory';

interface InventoryToolbarProps {
  filters: InventoryFilters;
  uniqueLocations: string[];
  resultCount: number;
  onFilterChange: (patch: Partial<InventoryFilters>) => void;
  onClearFilters: () => void;
}

const InventoryToolbar: React.FC<InventoryToolbarProps> = ({
  filters,
  uniqueLocations,
  resultCount,
  onFilterChange,
  onClearFilters,
}) => {
  const activeFilterCount = [
    !!filters.location,
    filters.lowStockOnly,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0 || !!filters.search;

  return (
    <div className="flex flex-col gap-2">
      {/* Single toolbar row */}
      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
        {/* Search */}
        <div className="relative flex-1 max-w-[300px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, SKU, or external ID..."
            value={filters.search ?? ''}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="h-8 pl-8 text-sm bg-transparent"
            aria-label="Search inventory by name, SKU, or external ID"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Separator orientation="vertical" className="h-5" />

        {/* Filter popover */}
        <InventoryFilterPopover
          filters={filters}
          uniqueLocations={uniqueLocations}
          activeFilterCount={activeFilterCount}
          onFilterChange={onFilterChange}
          onClearFilters={onClearFilters}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Result count */}
        <span
          className="text-xs text-muted-foreground whitespace-nowrap hidden lg:block"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="font-medium text-foreground">{resultCount}</span>
          {' items'}
        </span>
      </div>

      {/* Active filter badges row */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className="text-xs text-muted-foreground">Active:</span>

          {filters.location && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              <MapPin className="h-3 w-3" />
              {filters.location}
              <button
                onClick={() => onFilterChange({ location: undefined })}
                className="ml-0.5 hover:text-foreground"
                aria-label="Clear location filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.lowStockOnly && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              <AlertTriangle className="h-3 w-3 text-destructive" />
              Low Stock
              <button
                onClick={() => onFilterChange({ lowStockOnly: false })}
                className="ml-0.5 hover:text-foreground"
                aria-label="Clear low stock filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.search && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs h-5 px-2">
              &ldquo;{filters.search.length > 15 ? `${filters.search.slice(0, 15)}…` : filters.search}&rdquo;
              <button
                onClick={() => onFilterChange({ search: '' })}
                className="ml-0.5 hover:text-foreground"
                aria-label="Clear search filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onClearFilters}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};

export default InventoryToolbar;
