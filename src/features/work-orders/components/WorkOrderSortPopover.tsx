import React from 'react';
import { ListSortPopover } from '@/components/common/ListSortPopover';
import type { SortField, SortDirection } from '@/features/work-orders/hooks/useWorkOrderFilters';
import { WORK_ORDER_SORT_OPTIONS } from '@/features/work-orders/constants/workOrderSortOptions';

interface WorkOrderSortPopoverProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
}

const WorkOrderSortPopover: React.FC<WorkOrderSortPopoverProps> = ({
  sortField,
  sortDirection,
  onSortChange,
}) => {
  const compositeValue = `${sortField}:${sortDirection}`;
  const currentLabel =
    WORK_ORDER_SORT_OPTIONS.find((o) => o.value === compositeValue)?.label ?? compositeValue;

  return (
    <ListSortPopover
      sortOptions={WORK_ORDER_SORT_OPTIONS}
      compositeValue={compositeValue}
      currentLabel={currentLabel}
      onSelect={(value) => {
        const [field, direction] = value.split(':') as [SortField, SortDirection];
        onSortChange(field, direction);
      }}
      ariaLabel="Sort work orders"
      labelMaxWidthClass="max-w-[150px]"
    />
  );
};

export default WorkOrderSortPopover;
