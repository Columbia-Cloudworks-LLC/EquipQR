import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Building, MapPin, Users } from 'lucide-react';
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

interface DesktopEquipmentFiltersProps {
  filters: EquipmentFilters;
  onFilterChange: (key: keyof EquipmentFilters, value: string) => void;
  onClearFilters: () => void;
  filterOptions: FilterOptions;
  hasActiveFilters: boolean;
}

export const DesktopEquipmentFilters: React.FC<DesktopEquipmentFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  filterOptions,
  hasActiveFilters
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
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <Select value={filters.manufacturer} onValueChange={(value) => onFilterChange('manufacturer', value)}>
              <SelectTrigger>
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
              <SelectTrigger>
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
              <SelectTrigger>
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

            <div className="col-span-2 sm:col-span-1">
              <Button
                variant="outline"
                onClick={onClearFilters}
                disabled={!hasActiveFilters}
                className="w-full"
              >
                {hasActiveFilters ? 'Clear Filters' : 'No Active Filters'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};