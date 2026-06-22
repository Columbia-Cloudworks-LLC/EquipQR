// fallow-ignore-file code-duplication
// Duplication rationale: Desktop filters mirror mobile toolbar semantics
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { WorkOrderFilters as FiltersType } from '@/features/work-orders/types/workOrder';
import type { WorkOrderFiltersToolbarProps } from '@/features/work-orders/types/workOrderFiltersToolbarTypes';
import WorkOrderToolbar from './WorkOrderToolbar';
import MobileWorkOrderToolbar from './MobileWorkOrderToolbar';

export const WorkOrderFilters: React.FC<WorkOrderFiltersToolbarProps> = ({
  filters,
  activeFilterCount,
  activePresets,
  showMobileFilters,
  onShowMobileFiltersChange,
  onFilterChange,
  onClearFilters,
  onQuickFilter,
  sortField,
  sortDirection,
  onSortChange,
  resultCount,
  totalCount,
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileWorkOrderToolbar
        filters={filters}
        activeFilterCount={activeFilterCount}
        activePresets={activePresets}
        showMobileFilters={showMobileFilters}
        onShowMobileFiltersChange={onShowMobileFiltersChange}
        onFilterChange={onFilterChange}
        onClearFilters={onClearFilters}
        onQuickFilter={onQuickFilter}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={onSortChange}
      />
    );
  }

  return (
    <WorkOrderToolbar
      filters={filters}
      activeFilterCount={activeFilterCount}
      activePresets={activePresets}
      onFilterChange={onFilterChange}
      onClearFilters={onClearFilters}
      onQuickFilter={onQuickFilter}
      sortField={sortField}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      resultCount={resultCount}
      totalCount={totalCount}
    />
  );
};


