import React, { useState } from 'react';
import { Filter, MapPin, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-sm font-normal"
          aria-label={`Filter inventory${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
        >
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          Filter
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-4 min-w-4 rounded-full px-1 py-0 text-[10px] font-semibold leading-none"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="start">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filters
          </p>

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
                  setOpen(false);
                }}
              >
                <X className="h-3 w-3 mr-1.5" />
                Clear all filters
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default InventoryFilterPopover;
