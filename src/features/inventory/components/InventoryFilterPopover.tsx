import React from 'react';
import { MapPin, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterPopoverShell } from '@/components/filters/FilterPopoverShell';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import type { InventoryFilters } from '@/features/inventory/types/inventory';

interface InventoryFilterPopoverProps {
  filters: InventoryFilters;
  uniqueLocations: string[];
  activeFilterCount: number;
  onFilterChange: (patch: Partial<InventoryFilters>) => void;
  onClearFilters: () => void;
}

const InventoryFilterPopover: React.FC<InventoryFilterPopoverProps> = ({
  filters,
  uniqueLocations,
  activeFilterCount,
  onFilterChange,
  onClearFilters,
}) => {
  return (
    <FilterPopoverShell
      ariaSubject="inventory"
      activeFilterCount={activeFilterCount}
      contentClassName="w-64 p-4"
    >
      {({ close }) => (
        <>
          {/* Location */}
          {uniqueLocations.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Location</label>
              <Select
                value={filters.location ?? '__all__'}
                onValueChange={(v) =>
                  onFilterChange({ location: v === '__all__' ? undefined : v })
                }
              >
                <SelectTrigger className="h-8 text-sm" aria-label="Filter by location">
                  <MapPin className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Locations</SelectItem>
                  {uniqueLocations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Low stock toggle */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              <label
                htmlFor="inv-filter-low-stock"
                className="text-sm font-medium cursor-pointer"
              >
                Low Stock Only
              </label>
            </div>
            <Switch
              id="inv-filter-low-stock"
              checked={filters.lowStockOnly}
              onCheckedChange={(checked) => onFilterChange({ lowStockOnly: checked })}
            />
          </div>

          {activeFilterCount > 0 && (
            <>
              <Separator />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  onClearFilters();
                  close();
                }}
              >
                <X className="h-3 w-3 mr-1.5" />
                Clear all filters
              </Button>
            </>
          )}
        </>
      )}
    </FilterPopoverShell>
  );
};

export default InventoryFilterPopover;
