import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { WorkOrderFilters as FiltersType } from '@/features/work-orders/types/workOrder';
import type { QuickFilterPreset, SortField, SortDirection } from '@/features/work-orders/hooks/useWorkOrderFilters';
import WorkOrderToolbar from './WorkOrderToolbar';
import MobileWorkOrderToolbar from './MobileWorkOrderToolbar';

interface WorkOrderFiltersProps {
  filters: FiltersType;
  activeFilterCount: number;
  activePresets: Set<QuickFilterPreset>;
  showMobileFilters: boolean;
  onShowMobileFiltersChange: (show: boolean) => void;
  onFilterChange: (key: keyof FiltersType, value: string) => void;
  onClearFilters: () => void;
  onQuickFilter: (preset: QuickFilterPreset) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  resultCount: number;
  totalCount: number;
}

export const WorkOrderFilters: React.FC<WorkOrderFiltersProps> = ({
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
        resultCount={resultCount}
        totalCount={totalCount}
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


