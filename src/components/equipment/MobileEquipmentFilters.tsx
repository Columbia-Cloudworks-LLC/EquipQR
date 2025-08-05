import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, Filter, Settings, MapPin, Building, Calendar, X, Users } from 'lucide-react';
import { EquipmentFilters } from '@/hooks/useEquipmentFiltering';

interface Team {
  id: string;
  name: string;
}

interface FilterOptions {
  manufacturers: string[];
  locations: string[];
  teams: Team[];
}

interface MobileEquipmentFiltersProps {
  filters: EquipmentFilters;
  activeFilterCount: number;
  showMobileFilters: boolean;
  onShowMobileFiltersChange: (show: boolean) => void;
  onFilterChange: (key: keyof EquipmentFilters, value: any) => void;
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
  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
        <Input
          placeholder="Search equipment..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="pl-10 h-12 text-base"
        />
      </div>

      {/* Filter Button with Active Count */}
      <div className="flex gap-2">
        <Sheet open={showMobileFilters} onOpenChange={onShowMobileFiltersChange}>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex-1 h-12 justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh]">
            <SheetHeader className="pb-4">
              <SheetTitle>Filter Equipment</SheetTitle>
            </SheetHeader>
            
            {/* Quick Filter Presets */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-3">Quick Filters</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => onQuickFilter('active')}
                    className="h-12 justify-start"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Active
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onQuickFilter('maintenance')}
                    className="h-12 justify-start"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Maintenance
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onQuickFilter('needs-maintenance')}
                    className="h-12 justify-start"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Needs Maintenance
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onQuickFilter('warranty-expiring')}
                    className="h-12 justify-start"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Warranty Expiring
                  </Button>
                </div>
              </div>

              {/* Detailed Filters */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Detailed Filters</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
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
                    <label className="text-sm font-medium mb-2 block">Manufacturer</label>
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
                    <label className="text-sm font-medium mb-2 block">Location</label>
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
                    <label className="text-sm font-medium mb-2 block">Team</label>
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
                  className="w-full h-12"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filter Summary */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {filters.status}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFilterChange('status', 'all')}
              />
            </Badge>
          )}
          {filters.manufacturer !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Manufacturer: {filters.manufacturer}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFilterChange('manufacturer', 'all')}
              />
            </Badge>
          )}
          {filters.location !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Location: {filters.location}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFilterChange('location', 'all')}
              />
            </Badge>
          )}
          {filters.team !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
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