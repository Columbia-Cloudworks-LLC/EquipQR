import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet';
import { MobileListPersonalizationSheet } from '@/components/common/MobileListPersonalizationSheet';
import { MobileToolbarSheetContent } from '@/components/common/MobileToolbarSheetContent';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Filter, X, Check } from 'lucide-react';
import { ListSortFieldControls } from '@/components/common/ListSortFieldControls';
import type { EquipmentFilters, SortConfig } from '@/features/equipment/hooks/useEquipmentFiltering';
import {
  EquipmentLocationSelect,
  EquipmentManufacturerSelect,
  EquipmentStatusSelect,
} from '@/features/equipment/components/EquipmentFilterSelects';
import { EQUIPMENT_QUICK_FILTERS } from '@/features/equipment/components/equipmentFilterConstants';
import {
  EQUIPMENT_SORT_FIELD_OPTIONS,
  getEquipmentSortFieldDefaultOrder,
} from '@/features/equipment/components/equipmentSortOptions';

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
  sortConfig: SortConfig;
  onSortChange: (field: string, direction?: 'asc' | 'desc') => void;
}

const DEFAULT_SORT: SortConfig = { field: 'name', direction: 'asc' };

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
  sortConfig,
  onSortChange,
}) => {
  const [isFilterSheetOpen, setIsFilterSheetOpen] = React.useState(showMobileFilters);
  const [isPersonalizationOpen, setIsPersonalizationOpen] = React.useState(false);
  const mobileSearchInputId = 'equipment-search-mobile';
  const mobileStatusFilterId = 'equipment-status-filter-mobile';
  const mobileManufacturerFilterId = 'equipment-manufacturer-filter-mobile';
  const mobileLocationFilterId = 'equipment-location-filter-mobile';
  const mobileSortSelectId = 'equipment-sort-select-mobile';

  const hasNonDefaultSort =
    sortConfig.field !== DEFAULT_SORT.field || sortConfig.direction !== DEFAULT_SORT.direction;

  React.useEffect(() => {
    setIsFilterSheetOpen(showMobileFilters);
  }, [showMobileFilters]);

  const handleFilterSheetOpenChange = (open: boolean) => {
    setIsFilterSheetOpen(open);
    onShowMobileFiltersChange(open);
  };

  const handleSortFieldChange = (field: string) => {
    if (sortConfig.field === field) {
      onSortChange(field, sortConfig.direction === 'asc' ? 'desc' : 'asc');
      return;
    }
    onSortChange(field, getEquipmentSortFieldDefaultOrder(field));
  };

  const toggleSortOrder = () => {
    onSortChange(sortConfig.field, sortConfig.direction === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="space-y-3">
      {/* Search + Personalization + Filters */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={mobileSearchInputId}
            placeholder="Search equipment..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="h-11 pl-9"
            aria-label="Search equipment"
          />
        </div>

        <MobileListPersonalizationSheet
          open={isPersonalizationOpen}
          onOpenChange={setIsPersonalizationOpen}
          hasNonDefaultSort={hasNonDefaultSort}
          description="Change how equipment is sorted on this device."
        >
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sort by
            </p>
            <ListSortFieldControls
              sortField={sortConfig.field}
              sortOrder={sortConfig.direction}
              options={EQUIPMENT_SORT_FIELD_OPTIONS}
              onFieldChange={handleSortFieldChange}
              onOrderToggle={toggleSortOrder}
              fieldSelectAriaLabel="Sort equipment by field"
              selectTriggerId={mobileSortSelectId}
            />
          </div>
        </MobileListPersonalizationSheet>

        <Sheet open={isFilterSheetOpen} onOpenChange={handleFilterSheetOpenChange}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative h-11 w-11 shrink-0"
              aria-label={
                activeFilterCount > 0 ? `Open filters, ${activeFilterCount} active` : 'Open filters'
              }
            >
              <Filter className="h-4 w-4" aria-hidden />
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

          <MobileToolbarSheetContent className="flex flex-col overflow-hidden p-0">
            <div className="shrink-0 p-6 pb-4">
              <SheetHeader>
                <SheetTitle>Filter Equipment</SheetTitle>
                <SheetDescription>
                  Filter equipment by status, manufacturer, or location. Team scope is set from the
                  breadcrumb at the top of the screen.
                </SheetDescription>
              </SheetHeader>
            </div>

            <ScrollArea className="min-h-0 flex-1 px-6">
              <div className="space-y-6 pb-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Quick filters</h3>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT_QUICK_FILTERS.map((preset) => {
                      const isActive = activeQuickFilter === preset.value;
                      return (
                        <Button
                          key={preset.value}
                          size="sm"
                          variant={isActive ? 'default' : 'outline'}
                          className="min-h-11 whitespace-nowrap"
                          onClick={() => onQuickFilter(preset.value)}
                        >
                          {isActive && <Check className="mr-1 h-3 w-3" aria-hidden />}
                          {preset.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Filters</h3>

                  <div className="space-y-3">
                    <div>
                      <label htmlFor={mobileStatusFilterId} className="mb-2 block text-sm font-medium">
                        Status
                      </label>
                      <EquipmentStatusSelect
                        value={filters.status}
                        onValueChange={(value) => onFilterChange('status', value)}
                        placeholder="All Status"
                        triggerId={mobileStatusFilterId}
                        triggerClassName="h-12"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={mobileManufacturerFilterId}
                        className="mb-2 block text-sm font-medium"
                      >
                        Manufacturer
                      </label>
                      <EquipmentManufacturerSelect
                        value={filters.manufacturer}
                        onValueChange={(value) => onFilterChange('manufacturer', value)}
                        manufacturers={filterOptions.manufacturers}
                        triggerId={mobileManufacturerFilterId}
                        triggerClassName="h-12"
                      />
                    </div>

                    <div>
                      <label htmlFor={mobileLocationFilterId} className="mb-2 block text-sm font-medium">
                        Location
                      </label>
                      <EquipmentLocationSelect
                        value={filters.location}
                        onValueChange={(value) => onFilterChange('location', value)}
                        locations={filterOptions.locations}
                        triggerId={mobileLocationFilterId}
                        triggerClassName="h-12"
                      />
                    </div>
                  </div>

                  <Button variant="outline" onClick={onClearFilters} className="h-12 w-full">
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </MobileToolbarSheetContent>
        </Sheet>
      </div>

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
          <Button variant="ghost" size="sm" className="min-h-11 px-3 text-sm" onClick={onClearFilters}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};
