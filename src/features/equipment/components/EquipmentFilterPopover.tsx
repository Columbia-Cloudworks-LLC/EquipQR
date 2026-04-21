import React, { useState } from 'react';
import { Filter, Building, MapPin, X } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { EquipmentFilters } from '@/features/equipment/hooks/useEquipmentFiltering';

// Team is intentionally not part of FilterOptions here — the team scope is
// owned by the global TopBar `useSelectedTeam`. The popover only exposes
// page-local filters (status / manufacturer / location / quick filters).
interface FilterOptions {
  manufacturers: string[];
  locations: string[];
}

const quickFilters = [
  { label: 'Maintenance Due', value: 'maintenance-due' },
  { label: 'Warranty Expiring', value: 'warranty-expiring' },
  { label: 'Recently Added', value: 'recently-added' },
  { label: 'Active Only', value: 'active-only' },
];

interface EquipmentFilterPopoverProps {
  filters: EquipmentFilters;
  onFilterChange: (key: keyof EquipmentFilters, value: string) => void;
  onClearFilters: () => void;
  onQuickFilter: (preset: string) => void;
  filterOptions: FilterOptions;
  activeFilterCount: number;
  activeQuickFilter?: string | null;
}

const EquipmentFilterPopover: React.FC<EquipmentFilterPopoverProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  onQuickFilter,
  filterOptions,
  activeFilterCount,
  activeQuickFilter,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-sm font-normal"
          aria-label={`Filter equipment${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
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
      <PopoverContent className="w-72 p-4" align="start">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filters
          </p>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select
              value={filters.status}
              onValueChange={(value) => onFilterChange('status', value)}
            >
              <SelectTrigger className="h-8 text-sm" aria-label="Filter by status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="out_of_service">Out of Service</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Manufacturer */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Manufacturer</label>
            <Select
              value={filters.manufacturer}
              onValueChange={(value) => onFilterChange('manufacturer', value)}
            >
              <SelectTrigger className="h-8 text-sm" aria-label="Filter by manufacturer">
                <Building className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="All manufacturers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Manufacturers</SelectItem>
                {filterOptions.manufacturers.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Location</label>
            <Select
              value={filters.location}
              onValueChange={(value) => onFilterChange('location', value)}
            >
              <SelectTrigger className="h-8 text-sm" aria-label="Filter by location">
                <MapPin className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {filterOptions.locations.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Quick filters */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">Quick filters</p>
            <div className="flex flex-wrap gap-1.5">
              {quickFilters.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => onQuickFilter(preset.value)}
                  className={cn(
                    'inline-flex h-6 items-center rounded-full border px-2.5 text-[11px] font-medium transition-colors',
                    activeQuickFilter === preset.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
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

export default EquipmentFilterPopover;
