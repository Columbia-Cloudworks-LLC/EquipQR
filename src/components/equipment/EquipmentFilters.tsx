import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileEquipmentFilters } from './MobileEquipmentFilters';
import { DesktopEquipmentFilters } from './DesktopEquipmentFilters';
import { EquipmentFilters as EquipmentFiltersType } from './hooks/useEquipmentFiltering';

interface Team {
  id: string;
  name: string;
}

interface FilterOptions {
  manufacturers: string[];
  locations: string[];
  teams: Team[];
}

interface EquipmentFiltersProps {
  filters: EquipmentFiltersType;
  onFilterChange: (key: keyof EquipmentFiltersType, value: string) => void;
  onClearFilters: () => void;
  onQuickFilter: (preset: string) => void;
  filterOptions: FilterOptions;
  hasActiveFilters: boolean;
}

export const EquipmentFilters: React.FC<EquipmentFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  onQuickFilter,
  filterOptions,
  hasActiveFilters
}) => {
  const isMobile = useIsMobile();
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.manufacturer !== 'all') count++;
    if (filters.location !== 'all') count++;
    if (filters.team !== 'all') count++;
    if (filters.maintenanceDateFrom || filters.maintenanceDateTo) count++;
    if (filters.installationDateFrom || filters.installationDateTo) count++;
    if (filters.warrantyExpiring) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  const hasFiltersEnabled = hasActiveFilters || activeFilterCount > 0;

  if (isMobile) {
    return (
      <MobileEquipmentFilters
        filters={filters}
        activeFilterCount={activeFilterCount}
        showMobileFilters={showMobileFilters}
        onShowMobileFiltersChange={setShowMobileFilters}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
        onQuickFilter={onQuickFilter}
        filterOptions={filterOptions}
      />
    );
  }

  return (
    <DesktopEquipmentFilters
      filters={filters}
      onFilterChange={onFilterChange}
      onClearFilters={onClearFilters}
      filterOptions={filterOptions}
      hasActiveFilters={hasFiltersEnabled}
    />
  );
};