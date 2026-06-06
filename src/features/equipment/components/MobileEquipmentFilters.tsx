import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Filter, X } from 'lucide-react';
import { HorizontalChipRow } from '@/components/layout/HorizontalChipRow';
import { EquipmentFilters } from '@/features/equipment/hooks/useEquipmentFiltering';
import {
  EquipmentLocationSelect,
  EquipmentManufacturerSelect,
  EquipmentStatusSelect,
} from '@/features/equipment/components/EquipmentFilterSelects';
import { EQUIPMENT_QUICK_FILTERS } from '@/features/equipment/components/equipmentFilterConstants';

// Team is intentionally not part of FilterOptions here — the team scope is
// owned by the global TopBar `useSelectedTeam`.
interface FilterOptions {
  manufacturers: string[];
  locations: string[];
}

type EquipmentFilterKey = keyof EquipmentFilters;

interface MobileEquipmentFiltersProps {
  filters: EquipmentFilters;
  activeFilterCount: number;
  showMobileFilters: boolean;
  onShowMobileFiltersChange: (show: boolean) => void;
  onFilterChange: <K extends EquipmentFilterKey>(key: K, value: EquipmentFilters[K]) => void;
  onClearFilters: () => void;
  onQuickFilter: (preset: string) => void;
  filterOptions: FilterOptions;
  activeQuickFilter?: string | null;
}

export const MobileEquipmentFilters: React.FC<MobileEquipmentFiltersProps> = ({
  filters,
  activeFilterCount,
  showMobileFilters,
  onShowMobileFiltersChange,
  onFilterChange,
  onClearFilters,
  onQuickFilter,
  filterOptions,
  activeQuickFilter,
}) => {
  const [isSheetOpen, setIsSheetOpen] = React.useState(showMobileFilters);
  const mobileSearchInputId = 'equipment-search-mobile';
  const mobileStatusFilterId = 'equipment-status-filter-mobile';
  const mobileManufacturerFilterId = 'equipment-manufacturer-filter-mobile';
  const mobileLocationFilterId = 'equipment-location-filter-mobile';

  React.useEffect(() => {
    setIsSheetOpen(showMobileFilters);
  }, [showMobileFilters]);

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    onShowMobileFiltersChange(open);
  };

  return (
    <div className="space-y-3">
      {/* Row 1: Search + Filters (icon-only) */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={mobileSearchInputId}
            placeholder="Search equipment..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="h-11 pl-9"
          />
        </div>

        <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative h-11 w-11"
              aria-label="Open filters"
            >
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-[10px]"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>

          <SheetContent side="bottom" className="h-[calc(100dvh-2rem)] p-0">
          <div className="p-6 pb-0">
            <SheetHeader className="pb-4">
              <SheetTitle>Filter Equipment</SheetTitle>
              <SheetDescription>
                Filter equipment by status, manufacturer, or location. Team scope
                is set from the breadcrumb at the top of the screen.
              </SheetDescription>
            </SheetHeader>
          </div>

          <ScrollArea className="h-[calc(100dvh-2rem-100px)] px-6">
            <div className="space-y-4 pb-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Filters</h3>

                <div className="space-y-3">
                  <div>
                    <label htmlFor={mobileStatusFilterId} className="mb-2 block text-sm font-medium">Status</label>
                    <EquipmentStatusSelect
                      value={filters.status}
                      onValueChange={(value) => onFilterChange('status', value)}
                      placeholder="All Status"
                      triggerId={mobileStatusFilterId}
                      triggerClassName="h-12"
                    />
                  </div>

                  <div>
                    <label htmlFor={mobileManufacturerFilterId} className="mb-2 block text-sm font-medium">Manufacturer</label>
                    <EquipmentManufacturerSelect
                      value={filters.manufacturer}
                      onValueChange={(value) => onFilterChange('manufacturer', value)}
                      manufacturers={filterOptions.manufacturers}
                      triggerId={mobileManufacturerFilterId}
                      triggerClassName="h-12"
                    />
                  </div>

                  <div>
                    <label htmlFor={mobileLocationFilterId} className="mb-2 block text-sm font-medium">Location</label>
                    <EquipmentLocationSelect
                      value={filters.location}
                      onValueChange={(value) => onFilterChange('location', value)}
                      locations={filterOptions.locations}
                      triggerId={mobileLocationFilterId}
                      triggerClassName="h-12"
                    />
                  </div>
                </div>

                {/* Clear All Button */}
                <Button
                  variant="outline"
                  onClick={onClearFilters}
                  className="h-12 w-full"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>

      <HorizontalChipRow ariaLabel="Quick filter options">
        {EQUIPMENT_QUICK_FILTERS.map((preset) => (
          <Button
            key={preset.value}
            size="sm"
            variant={activeQuickFilter === preset.value ? 'default' : 'outline'}
            className="shrink-0 whitespace-nowrap min-h-11"
            onClick={() => {
              onQuickFilter(preset.value);
              handleSheetOpenChange(false);
            }}
          >
            {preset.label}
          </Button>
        ))}
      </HorizontalChipRow>

      {/* Active Filter Summary with Clear All */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active:</span>
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="flex shrink-0 items-center gap-1 whitespace-nowrap">
              Status: {filters.status}
              <X
                className="h-3 w-3 cursor-pointer hover:text-foreground"
                onClick={() => onFilterChange('status', 'all')}
                aria-label="Clear status filter"
              />
            </Badge>
          )}
          {filters.manufacturer !== 'all' && (
            <Badge variant="secondary" className="flex shrink-0 items-center gap-1 whitespace-nowrap">
              Manufacturer: {filters.manufacturer}
              <X
                className="h-3 w-3 cursor-pointer hover:text-foreground"
                onClick={() => onFilterChange('manufacturer', 'all')}
                aria-label="Clear manufacturer filter"
              />
            </Badge>
          )}
          {filters.location !== 'all' && (
            <Badge variant="secondary" className="flex shrink-0 items-center gap-1 whitespace-nowrap">
              Location: {filters.location}
              <X
                className="h-3 w-3 cursor-pointer hover:text-foreground"
                onClick={() => onFilterChange('location', 'all')}
                aria-label="Clear location filter"
              />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 px-3 text-sm"
            onClick={onClearFilters}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};
