import React from 'react';
import { ListSortPopover } from '@/components/common/ListSortPopover';
import type { SortConfig } from '@/features/equipment/hooks/useEquipmentFiltering';
import { EQUIPMENT_SORT_OPTIONS, equipmentSortLabel } from '@/features/equipment/components/equipmentSortOptions';

interface EquipmentSortPopoverProps {
  sortConfig: SortConfig;
  onSortChange: (field: string, direction?: 'asc' | 'desc') => void;
}

const EquipmentSortPopover: React.FC<EquipmentSortPopoverProps> = ({
  sortConfig,
  onSortChange,
}) => {
  const compositeValue = `${sortConfig.field}:${sortConfig.direction}`;
  const currentLabel = equipmentSortLabel(EQUIPMENT_SORT_OPTIONS, compositeValue, sortConfig.field);

  return (
    <ListSortPopover
      sortOptions={EQUIPMENT_SORT_OPTIONS}
      compositeValue={compositeValue}
      currentLabel={currentLabel}
      onSelect={(value) => {
        const [field, direction] = value.split(':') as [string, 'asc' | 'desc'];
        onSortChange(field, direction);
      }}
      ariaLabel="Sort equipment"
      labelMaxWidthClass="max-w-[140px]"
    />
  );
};

export default EquipmentSortPopover;
