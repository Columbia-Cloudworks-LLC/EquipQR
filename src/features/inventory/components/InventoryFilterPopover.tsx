import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { InventoryLocationFilterSelect } from '@/features/inventory/components/InventoryLocationFilterSelect';
import { Button } from '@/components/ui/button';
import { FilterPopoverShell } from '@/components/filters/FilterPopoverShell';
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
              <span className="text-xs text-muted-foreground">Location Name</span>
              <InventoryLocationFilterSelect
                value={filters.location ?? '__all__'}
                onValueChange={(v) =>
                  onFilterChange({ location: v === '__all__' ? undefined : v })
                }
                uniqueLocations={uniqueLocations}
                triggerClassName="h-8 text-sm"
              />
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
