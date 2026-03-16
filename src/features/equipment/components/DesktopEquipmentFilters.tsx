import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Building, MapPin, Users, X } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
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

interface DesktopEquipmentFiltersProps {
  filters: EquipmentFilters;
  onFilterChange: (key: keyof EquipmentFilters, value: string) => void;
  onClearFilters: () => void;
  onQuickFilter: (preset: string) => void;
  filterOptions: FilterOptions;
  hasActiveFilters: boolean;
  activeQuickFilter?: string | null;
}

export const DesktopEquipmentFilters: React.FC<DesktopEquipmentFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  onQuickFilter,
  filterOptions,
  hasActiveFilters,
  activeQuickFilter,
}) => {
  return (
    <Card className="bg-muted/50">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search equipment..."
                  value={filters.search}
                  onChange={(e) => onFilterChange('search', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filters.status} onValueChange={(value) => onFilterChange('status', value)}>
              <SelectTrigger className="w-[180px]" aria-label="Filter by status">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="out_of_service">Out of Service</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <Select value={filters.manufacturer} onValueChange={(value) => onFilterChange('manufacturer', value)}>
              <SelectTrigger aria-label="Manufacturer">
                <Building className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Manufacturer" />
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

            <Select value={filters.location} onValueChange={(value) => onFilterChange('location', value)}>
              <SelectTrigger aria-label="Location">
                <MapPin className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Location" />
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

            <Select value={filters.team} onValueChange={(value) => onFilterChange('team', value)}>
              <SelectTrigger aria-label="Team">
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Team" />
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

            {hasActiveFilters && (
              <div className="col-span-2 sm:col-span-1">
                <Button
                  variant="outline"
                  onClick={onClearFilters}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: 'Maintenance Due', value: 'maintenance-due' },
              { label: 'Warranty Expiring', value: 'warranty-expiring' },
              { label: 'Recently Added', value: 'recently-added' },
              { label: 'Active Only', value: 'active-only' },
            ].map((preset) => (
              <Button
                key={preset.value}
                size="sm"
                variant={activeQuickFilter === preset.value ? 'default' : 'outline'}
                className="h-7 text-xs"
                onClick={() => onQuickFilter(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Active:</span>
              {filters.status !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  Status: {filters.status}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-foreground"
                    onClick={() => onFilterChange('status', 'all')}
                    aria-label="Clear status filter"
                  />
                </Badge>
              )}
              {filters.manufacturer !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  Manufacturer: {filters.manufacturer}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-foreground"
                    onClick={() => onFilterChange('manufacturer', 'all')}
                    aria-label="Clear manufacturer filter"
                  />
                </Badge>
              )}
              {filters.location !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  Location: {filters.location}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-foreground"
                    onClick={() => onFilterChange('location', 'all')}
                    aria-label="Clear location filter"
                  />
                </Badge>
              )}
              {filters.team !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  Team: {filterOptions.teams.find(t => t.id === filters.team)?.name || filters.team}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-foreground"
                    onClick={() => onFilterChange('team', 'all')}
                    aria-label="Clear team filter"
                  />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={onClearFilters}
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};