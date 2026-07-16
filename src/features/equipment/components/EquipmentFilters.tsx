import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileEquipmentFilters } from './MobileEquipmentFilters';
import EquipmentToolbar from './EquipmentToolbar';
import type { EquipmentListToolbarProps } from '@/features/equipment/components/equipmentFilterTypes';

type EquipmentFiltersProps = EquipmentListToolbarProps;

export const EquipmentFilters: React.FC<EquipmentFiltersProps> = ({
  filters,
  sortConfig,
  onFilterChange,
  onClearFilters,
  onQuickFilter,
  onSortChange,
  filterOptions,
  hasActiveFilters,
  activeQuickFilter,
  viewMode,
  onViewModeChange,
  canImport,
  canExport,
  onImportCsv,
  equipment,
  columnPicker,
}) => {
  const isMobile = useIsMobile();
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // `filters.team` is driven by the global TopBar selection and is intentionally
  // excluded from the page-local active-filter count.
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.manufacturer !== 'all') count++;
    if (filters.location !== 'all') count++;
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
        activeQuickFilter={activeQuickFilter}
        sortConfig={sortConfig}
        onSortChange={onSortChange}
      />
    );
  }

  return (
    <EquipmentToolbar
      filters={filters}
      sortConfig={sortConfig}
      onFilterChange={onFilterChange}
      onClearFilters={onClearFilters}
      onQuickFilter={onQuickFilter}
      onSortChange={onSortChange}
      filterOptions={filterOptions}
      hasActiveFilters={hasFiltersEnabled}
      activeQuickFilter={activeQuickFilter}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      canImport={canImport}
      canExport={canExport}
      onImportCsv={onImportCsv}
      equipment={equipment}
      columnPicker={columnPicker}
    />
  );
};