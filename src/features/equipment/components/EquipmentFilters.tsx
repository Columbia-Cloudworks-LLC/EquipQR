import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileEquipmentFilters } from './MobileEquipmentFilters';
import EquipmentToolbar from './EquipmentToolbar';
import { EquipmentFilters as EquipmentFiltersType, SortConfig } from '@/features/equipment/hooks/useEquipmentFiltering';
import type { EquipmentViewMode } from './EquipmentCard';
import type { EquipmentRecord } from '@/features/equipment/types/equipment';

// Team is intentionally not part of FilterOptions here — the team scope is
// owned by the global TopBar `useSelectedTeam`, not by the page filters.
interface FilterOptions {
  manufacturers: string[];
  locations: string[];
}

interface EquipmentFiltersProps {
  filters: EquipmentFiltersType;
  sortConfig: SortConfig;
  onFilterChange: (key: keyof EquipmentFiltersType, value: string) => void;
  onClearFilters: () => void;
  onQuickFilter: (preset: string) => void;
  onSortChange: (field: string, direction?: 'asc' | 'desc') => void;
  filterOptions: FilterOptions;
  hasActiveFilters: boolean;
  activeQuickFilter?: string | null;
  resultCount: number;
  totalCount: number;
  viewMode: EquipmentViewMode;
  onViewModeChange: (mode: EquipmentViewMode) => void;
  canImport?: boolean;
  canExport?: boolean;
  onImportCsv?: () => void;
  equipment?: EquipmentRecord[];
  /**
   * Desktop-only view-mode-specific control. Mobile branch ignores this prop
   * because the table view auto-falls-back to list mode on mobile (see
   * `Equipment.tsx`).
   */
  columnPicker?: React.ReactNode;
}

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
  resultCount,
  totalCount,
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
      resultCount={resultCount}
      totalCount={totalCount}
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