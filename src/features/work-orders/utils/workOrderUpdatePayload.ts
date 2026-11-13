import type { UpdateWorkOrderData } from '@/features/work-orders/hooks/useWorkOrderUpdate';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import type { Database } from '@/integrations/supabase/types';

export type WorkOrderTableUpdate = Database['public']['Tables']['work_orders']['Update'];

/** Statuses that reopen a work order, so any earlier completion date is cleared. */
const REOPENED_STATUSES: readonly WorkOrderStatus[] = ['submitted', 'accepted', 'assigned', 'in_progress'];

/**
 * Builds the `work_orders` payload for a status change. Online updates, the
 * offline-aware service and offline queue replay all use it, so every path
 * writes the same columns:
 * - `assignee_id`: set when `assigneeId` is given (`undefined` leaves it alone,
 *   `null` unassigns)
 * - `acceptance_date`: stamped on `accepted`, and on `assigned` / `in_progress`
 *   when an assignee is given (the "Assign & Start" flow skips `assigned`)
 * - `completed_date`: stamped when completing, cleared when reopening
 */
export function buildWorkOrderStatusUpdatePayload(
  newStatus: WorkOrderStatus,
  assigneeId?: string | null,
): WorkOrderTableUpdate {
  const now = new Date().toISOString();
  const updateData: WorkOrderTableUpdate = {
    status: newStatus,
    updated_at: now,
  };

  if (assigneeId !== undefined) {
    updateData.assignee_id = assigneeId;
  }

  const hasAssignee = assigneeId != null && assigneeId !== '';
  if (newStatus === 'accepted' || ((newStatus === 'assigned' || newStatus === 'in_progress') && hasAssignee)) {
    updateData.acceptance_date = now;
  }

  if (newStatus === 'completed') {
    updateData.completed_date = now;
  }
  if (REOPENED_STATUSES.includes(newStatus)) {
    updateData.completed_date = null;
  }
  return updateData;
}

/** Maps camelCase work-order update fields to Supabase `work_orders` column payload. */
export function buildWorkOrderUpdatePayload(data: UpdateWorkOrderData): WorkOrderTableUpdate {
  const updateData: WorkOrderTableUpdate = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.dueDate !== undefined) {
    updateData.due_date = data.dueDate || null;
    updateData.due_date_has_time = data.dueDateHasTime ?? false;
  } else if (data.dueDateHasTime !== undefined) {
    updateData.due_date_has_time = data.dueDateHasTime;
  }
  if (data.estimatedHours !== undefined) updateData.estimated_hours = data.estimatedHours || null;
  if (data.hasPM !== undefined) updateData.has_pm = data.hasPM;
  updateData.updated_at = new Date().toISOString();
  return updateData;
}
