import React from 'react';
import { GridTableViewModeToggle } from '@/components/common/GridTableViewModeToggle';
import { SortConfig } from '@/features/equipment/hooks/useEquipmentFiltering';
import type { EquipmentViewMode } from './EquipmentCard';
import { EQUIPMENT_SORT_OPTIONS, equipmentSortLabel } from '@/features/equipment/components/equipmentSortOptions';
import { EquipmentSortSelect } from '@/features/equipment/components/EquipmentSortSelect';

interface EquipmentSortHeaderProps {
  sortConfig: SortConfig;
  onSortChange: (field: string, direction?: 'asc' | 'desc') => void;
  resultCount: number;
  totalCount: number;
  viewMode?: EquipmentViewMode;
  onViewModeChange?: (mode: EquipmentViewMode) => void;
}

const EquipmentSortHeader: React.FC<EquipmentSortHeaderProps> = ({
  sortConfig,
  onSortChange,
  resultCount,
  totalCount,
  viewMode = 'grid',
  onViewModeChange,
}) => {
  const compositeValue = `${sortConfig.field}:${sortConfig.direction}`;
  const currentLabel = equipmentSortLabel(EQUIPMENT_SORT_OPTIONS, compositeValue, sortConfig.field);

  const handleCompositeChange = (value: string) => {
    const [field, direction] = value.split(':') as [string, 'asc' | 'desc'];
    onSortChange(field, direction);
  };

  return (
    <div className="mb-4 flex items-center justify-between md:mb-6">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Sorted by {currentLabel}. Showing {resultCount} of {totalCount} equipment.
      </div>

      <div className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{resultCount}</span> of{' '}
        <span className="font-medium text-foreground">{totalCount}</span> equipment
      </div>
      <div className="flex items-center gap-2">
        <EquipmentSortSelect
          compositeValue={compositeValue}
          onValueChange={handleCompositeChange}
        />

        {onViewModeChange && (
          <GridTableViewModeToggle
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            gridValue="grid"
            tableValue="table"
          />
        )}
      </div>
    </div>
  );
};

export default EquipmentSortHeader;
