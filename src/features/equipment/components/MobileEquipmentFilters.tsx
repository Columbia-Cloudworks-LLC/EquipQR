
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Filter, X } from 'lucide-react';
import { EquipmentFilters } from '@/features/equipment/hooks/useEquipmentFiltering';

interface Team {
  id: string;
  name: string;
}

interface FilterOptions {
  manufacturers: string[];
  locations: string[];
  teams: Team[];
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
}

export const MobileEquipmentFilters: React.FC<MobileEquipmentFiltersProps> = ({
  filters,
  activeFilterCount,
  showMobileFilters,
  onShowMobileFiltersChange,
  onFilterChange,
  onClearFilters,
  onQuickFilter,
  filterOptions
}) => {
  const [isSheetOpen, setIsSheetOpen] = React.useState(showMobileFilters);

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
            placeholder="Search equipment..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="h-10 pl-9"
          />
        </div>

        <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative h-10 w-10"
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
                Filter equipment by status, manufacturer, location, or team.
              </SheetDescription>
            </SheetHeader>
          </div>

          <ScrollArea className="h-[calc(100dvh-2rem-100px)] px-6">
            <div className="space-y-4 pb-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Filters</h3>

                <div className="space-y-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Status</label>
                    <Select value={filters.status} onValueChange={(value) => onFilterChange('status', value)}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Manufacturer</label>
                    <Select value={filters.manufacturer} onValueChange={(value) => onFilterChange('manufacturer', value)}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="All Manufacturers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Manufacturers</SelectItem>
                        {filterOptions.manufacturers.map((manufacturer) => (
                          <SelectItem key={manufacturer} value={manufacturer}>
                            {manufacturer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Location</label>
                    <Select value={filters.location} onValueChange={(value) => onFilterChange('location', value)}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="All Locations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {filterOptions.locations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Team</label>
                    <Select value={filters.team} onValueChange={(value) => onFilterChange('team', value)}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="All Teams" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Teams</SelectItem>
                        {filterOptions.teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

      {/* Quick Filters */}
      <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
        {[
          { label: 'Maintenance Due', value: 'maintenance-due' },
          { label: 'Warranty Expiring', value: 'warranty-expiring' },
          { label: 'Recently Added', value: 'recently-added' },
          { label: 'Active Only', value: 'active-only' }
        ].map((preset) => (
          <Button
            key={preset.value}
            size="sm"
            variant="outline"
            className="shrink-0 whitespace-nowrap"
            onClick={() => {
              onQuickFilter(preset.value);
              handleSheetOpenChange(false);
            }}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Active Filter Summary */}
      {activeFilterCount > 0 && (
        <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="flex shrink-0 items-center gap-1 whitespace-nowrap">
              Status: {filters.status}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFilterChange('status', 'all')}
              />
            </Badge>
          )}
          {filters.manufacturer !== 'all' && (
            <Badge variant="secondary" className="flex shrink-0 items-center gap-1 whitespace-nowrap">
              Manufacturer: {filters.manufacturer}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFilterChange('manufacturer', 'all')}
              />
            </Badge>
          )}
          {filters.location !== 'all' && (
            <Badge variant="secondary" className="flex shrink-0 items-center gap-1 whitespace-nowrap">
              Location: {filters.location}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFilterChange('location', 'all')}
              />
            </Badge>
          )}
          {filters.team !== 'all' && (
            <Badge variant="secondary" className="flex shrink-0 items-center gap-1 whitespace-nowrap">
              Team: {filterOptions.teams.find(t => t.id === filters.team)?.name || filters.team}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFilterChange('team', 'all')}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
