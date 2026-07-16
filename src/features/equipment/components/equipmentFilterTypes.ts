import type React from 'react';
import type { EquipmentFilters, SortConfig } from '@/features/equipment/hooks/useEquipmentFiltering';
import type { EquipmentViewMode } from '@/features/equipment/components/EquipmentCard';
import type { EquipmentRecord } from '@/features/equipment/types/equipment';

/** Team scope is owned by TopBar `useSelectedTeam`, not page filters. */
export type EquipmentFilterOptions = {
  manufacturers: string[];
  locations: string[];
};

export type EquipmentListToolbarProps = {
  filters: EquipmentFilters;
  sortConfig: SortConfig;
  onFilterChange: (key: keyof EquipmentFilters, value: string) => void;
  onClearFilters: () => void;
  onQuickFilter: (preset: string) => void;
  onSortChange: (field: string, direction?: 'asc' | 'desc') => void;
  filterOptions: EquipmentFilterOptions;
  hasActiveFilters: boolean;
  activeQuickFilter?: string | null;
  viewMode: EquipmentViewMode;
  onViewModeChange: (mode: EquipmentViewMode) => void;
  canImport?: boolean;
  canExport?: boolean;
  onImportCsv?: () => void;
  equipment?: EquipmentRecord[];
  columnPicker?: React.ReactNode;
};
