import type { QuickFilterPreset } from '@/features/work-orders/hooks/useWorkOrderFilters';
import type { ListSortFieldKind } from '@/components/common/listSortFieldKind';

export type WorkOrderSortFieldOption = {
  value: string;
  label: string;
  kind: ListSortFieldKind;
  defaultOrder: 'asc' | 'desc';
};

/** Field-only options for mobile Personalize list (direction is toggled separately). */
export const WORK_ORDER_SORT_FIELD_OPTIONS: WorkOrderSortFieldOption[] = [
  { value: 'created', label: 'Created', kind: 'default', defaultOrder: 'desc' },
  { value: 'due_date', label: 'Due Date', kind: 'default', defaultOrder: 'asc' },
  { value: 'priority', label: 'Priority', kind: 'numeric', defaultOrder: 'desc' },
  { value: 'status', label: 'Status', kind: 'default', defaultOrder: 'asc' },
];

/** Composite options for desktop sort popover. */
export const WORK_ORDER_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'created:desc', label: 'Created (newest)' },
  { value: 'created:asc', label: 'Created (oldest)' },
  { value: 'due_date:asc', label: 'Due Date (soonest)' },
  { value: 'due_date:desc', label: 'Due Date (latest)' },
  { value: 'priority:desc', label: 'Priority (high first)' },
  { value: 'priority:asc', label: 'Priority (low first)' },
  { value: 'status:asc', label: 'Status (earliest)' },
  { value: 'status:desc', label: 'Status (latest)' },
];

export const WORK_ORDER_QUICK_FILTER_PRESETS: { label: string; value: QuickFilterPreset }[] = [
  { label: 'My Work', value: 'my-work' },
  { label: 'Urgent', value: 'urgent' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Unassigned', value: 'unassigned' },
];

export function getWorkOrderSortFieldDefaultOrder(field: string): 'asc' | 'desc' {
  return (
    WORK_ORDER_SORT_FIELD_OPTIONS.find((option) => option.value === field)?.defaultOrder ?? 'asc'
  );
}
