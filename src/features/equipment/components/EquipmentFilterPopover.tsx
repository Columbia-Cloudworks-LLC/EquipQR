import React from 'react';
import { Button } from '@/components/ui/button';
import { FilterPopoverClearAllFooter } from '@/components/filters/FilterPopoverClearAllFooter';
import { FilterPopoverShell } from '@/components/filters/FilterPopoverShell';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { EquipmentFilters } from '@/features/equipment/hooks/useEquipmentFiltering';
import {
  EquipmentLocationSelect,
  EquipmentManufacturerSelect,
  EquipmentStatusSelect,
} from '@/features/equipment/components/EquipmentFilterSelects';
import { EQUIPMENT_QUICK_FILTERS } from '@/features/equipment/components/equipmentFilterConstants';
import { EquipmentStatusRailLegend } from '@/features/equipment/components/EquipmentStatusRailLegend';

// Team is intentionally not part of FilterOptions here — the team scope is
// owned by the global TopBar `useSelectedTeam`. The popover only exposes
// page-local filters (status / manufacturer / location / quick filters).
interface FilterOptions {
  manufacturers: string[];
  locations: string[];
}

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
  return (
    <FilterPopoverShell ariaSubject="equipment" activeFilterCount={activeFilterCount}>
      {({ close }) => (
        <>
          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Status</label>
            <EquipmentStatusSelect
              value={filters.status}
              onValueChange={(value) => onFilterChange('status', value)}
              placeholder="All statuses"
              triggerClassName="h-8 text-sm"
              labels={{
                all: 'All Statuses',
                active: 'Active',
                maintenance: 'Maintenance',
                inactive: 'Inactive',
                out_of_service: 'Out of Service',
              }}
            />
          </div>

          <EquipmentStatusRailLegend />

          {/* Manufacturer */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Manufacturer</label>
            <EquipmentManufacturerSelect
              value={filters.manufacturer}
              onValueChange={(value) => onFilterChange('manufacturer', value)}
              manufacturers={filterOptions.manufacturers}
              placeholder="All manufacturers"
              ariaLabel="Filter by manufacturer"
              triggerClassName="h-8 text-sm"
              showIcon
            />
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Location</label>
            <EquipmentLocationSelect
              value={filters.location}
              onValueChange={(value) => onFilterChange('location', value)}
              locations={filterOptions.locations}
              placeholder="All locations"
              ariaLabel="Filter by location"
              triggerClassName="h-8 text-sm"
              showIcon
            />
          </div>

          <Separator />

          {/* Quick filters */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">Quick filters</p>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT_QUICK_FILTERS.map((preset) => (
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

          <FilterPopoverClearAllFooter
            activeFilterCount={activeFilterCount}
            onClearFilters={onClearFilters}
            onClose={close}
          />
        </>
      )}
    </FilterPopoverShell>
  );
};

export default EquipmentFilterPopover;
