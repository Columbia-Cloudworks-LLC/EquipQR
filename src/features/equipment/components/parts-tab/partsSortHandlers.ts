import { SORT_OPTIONS } from './types';
import type { PartsSortField, PartsSortOrder } from './types';

export function partsToolbarSortValue(sortField: PartsSortField, sortOrder: PartsSortOrder): string {
  return `${sortField}-${sortOrder}`;
}

export function createPartsSortChangeHandler(
  onSortChange: (field: PartsSortField, order: PartsSortOrder) => void,
) {
  return (value: string) => {
    const option = SORT_OPTIONS.find((opt) => opt.value === value);
    if (option) {
      onSortChange(option.field, option.order);
    }
  };
}
