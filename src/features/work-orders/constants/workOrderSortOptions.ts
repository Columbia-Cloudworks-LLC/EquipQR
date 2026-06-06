import type { QuickFilterPreset } from '@/features/work-orders/hooks/useWorkOrderFilters';

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
