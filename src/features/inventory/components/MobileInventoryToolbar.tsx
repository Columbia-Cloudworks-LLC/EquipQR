import React from 'react';
import { Search, SlidersHorizontal, MapPin, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { InventoryFilters } from '@/features/inventory/types/inventory';

const SORT_OPTIONS: { value: NonNullable<InventoryFilters['sortBy']>; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'sku', label: 'SKU' },
  { value: 'external_id', label: 'External ID' },
  { value: 'quantity_on_hand', label: 'Quantity' },
  { value: 'location', label: 'Location' },
  { value: 'status', label: 'Status' },
];

export interface MobileInventoryToolbarProps {
  filters: InventoryFilters;
  onFilterChange: (patch: Partial<InventoryFilters>) => void;
  onClearSheetFilters: () => void;
  uniqueLocations: string[];
  /** Number of rows in the current (filtered) list */
  resultCount: number;
  /** Low-stock items in org (unfiltered catalog) for the alert chip */
  lowStockOrgWide: number;
  /** Active filter count for badge (search + lowStock + location) */
  activeFilterCount: number;
}

const MobileInventoryToolbar: React.FC<MobileInventoryToolbarProps> = ({
  filters,
  onFilterChange,
  onClearSheetFilters,
  uniqueLocations,
  resultCount,
  lowStockOrgWide,
  activeFilterCount,
}) => {
  const sortBy = filters.sortBy ?? 'name';
  const sortOrder = filters.sortOrder ?? 'asc';

  const toggleSortOrder = () => {
    onFilterChange({
      sortOrder: sortOrder === 'asc' ? 'desc' : 'asc',
    });
  };

  const handleSortField = (value: string) => {
    const next = value as NonNullable<InventoryFilters['sortBy']>;
    onFilterChange({
      sortBy: next,
      sortOrder: sortBy === next ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc',
    });
  };

  const canReset =
    !!filters.search?.trim() ||
    !!filters.location ||
    filters.lowStockOnly ||
    sortBy !== 'name' ||
    sortOrder !== 'asc';

  return (
    <div className="space-y-3">
      {/* Stats row — glanceable, tappable low-stock filter */}
      <div
        className="flex flex-wrap items-center gap-2"
        aria-live="polite"
        aria-atomic="false"
      >
        <div className="inline-flex items-baseline gap-1.5 rounded-md border border-border/80 bg-muted/30 px-3 py-2">
          <span className="text-lg font-semibold tabular-nums text-foreground">{resultCount}</span>
          <span className="text-sm font-medium text-muted-foreground">
            {resultCount === 1 ? 'item' : 'items'}
          </span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px] font-semibold uppercase tracking-wide">
              Filtered
            </Badge>
          )}
        </div>
        {lowStockOrgWide > 0 && (
          <button
            type="button"
            onClick={() => onFilterChange({ lowStockOnly: !filters.lowStockOnly })}
            className={cn(
              'inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 py-2 text-left text-sm font-semibold transition-colors touch-manipulation',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              filters.lowStockOnly
                ? 'border-warning bg-warning/20 text-warning-foreground'
                : 'border-warning/50 bg-warning/10 text-warning hover:bg-warning/15 active:bg-warning/20'
            )}
            aria-pressed={filters.lowStockOnly}
            aria-label={
              filters.lowStockOnly
                ? `Low stock filter on, ${lowStockOrgWide} items. Tap to show all.`
                : `Show ${lowStockOrgWide} low stock items only`
            }
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span className="tabular-nums">{lowStockOrgWide}</span>
            <span className="font-medium">low stock</span>
          </button>
        )}
      </div>

      {/* Search + Sort & Filter */}
      <div className="flex items-stretch gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, or ID…"
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="h-11 pl-9"
            aria-label="Search inventory by name, SKU, or ID"
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="h-11 shrink-0 gap-2 px-3"
              aria-label={
                activeFilterCount > 0
                  ? `Sort and filter, ${activeFilterCount} active`
                  : 'Sort and filter'
              }
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-xs font-medium sm:text-sm">Sort & Filter</span>
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 min-w-5 px-1.5 text-[10px] leading-none"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[min(85vh,560px)] overflow-y-auto">
            <SheetHeader className="pb-2 text-left">
              <SheetTitle>Sort & filter</SheetTitle>
              <SheetDescription>
                Narrow the list by location or stock level, and change sort order.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 pb-8 pt-2">
              {/* Sort */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Sort by
                </p>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={handleSortField}>
                    <SelectTrigger className="h-11 flex-1" aria-label="Sort inventory by field">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0 touch-manipulation"
                    onClick={toggleSortOrder}
                    aria-label={sortOrder === 'asc' ? 'Ascending order, tap for descending' : 'Descending order, tap for ascending'}
                  >
                    {sortOrder === 'asc' ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Location */}
              {uniqueLocations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Location
                  </p>
                  <Select
                    value={filters.location ?? '__all__'}
                    onValueChange={(v) =>
                      onFilterChange({ location: v === '__all__' ? undefined : v })
                    }
                  >
                    <SelectTrigger className="h-11" aria-label="Filter by location">
                      <MapPin className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <SelectValue placeholder="All locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All locations</SelectItem>
                      {uniqueLocations.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Low stock */}
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
                  <Label htmlFor="low-stock-mobile-sheet" className="text-base font-medium">
                    Low stock only
                  </Label>
                </div>
                <Switch
                  id="low-stock-mobile-sheet"
                  checked={filters.lowStockOnly}
                  onCheckedChange={(checked) => onFilterChange({ lowStockOnly: checked })}
                />
              </div>

              <Button
                variant="outline"
                className="h-12 w-full touch-manipulation"
                disabled={!canReset}
                onClick={() => {
                  onClearSheetFilters();
                }}
              >
                Reset sort & filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default MobileInventoryToolbar;
