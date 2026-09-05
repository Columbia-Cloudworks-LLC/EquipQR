import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import { isWorkOrderEditLocked } from '@/features/work-orders/utils/workOrderNotePermissions';

export type CalendarEditability =
  | { readonly kind: 'editable' }
  | { readonly kind: 'readOnly'; readonly reason: 'locked' | 'forbidden' | 'offlinePending' };

export function calendarEditability(input: {
  engineCanEdit: boolean;
  status: WorkOrderStatus;
  isOfflinePending: boolean;
}): CalendarEditability {
  if (input.isOfflinePending) {
    return { kind: 'readOnly', reason: 'offlinePending' };
  }
  if (!input.engineCanEdit) {
    return { kind: 'readOnly', reason: 'forbidden' };
  }
  if (isWorkOrderEditLocked(input.status)) {
    return { kind: 'readOnly', reason: 'locked' };
  }
  return { kind: 'editable' };
}
