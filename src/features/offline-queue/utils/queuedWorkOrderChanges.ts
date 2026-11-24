/**
 * Shows work order changes that are still waiting in the offline queue.
 *
 * A status change, assignment or edit made with no connection is queued, not
 * written to the saved copy of the work order. Without this the screen keeps
 * showing the old status, so "Start Work" appears to do nothing and the next
 * step (pause, complete) is never offered.
 */
import type { OfflineQueueItem } from '@/services/offlineQueueService';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import {
  buildWorkOrderStatusUpdatePayload,
  buildWorkOrderUpdatePayload,
} from '@/features/work-orders/utils/workOrderUpdatePayload';

/** Queue items that will still be sent (failed ones wait for a manual retry). */
export function isLiveQueueItem(item: OfflineQueueItem): boolean {
  return item.status === 'pending' || item.status === 'processing';
}

export type AssigneeNameLookup = (userId: string) => string | undefined;

/**
 * The work order as it will look once its queued changes sync. Returns the
 * same object when nothing is queued for it.
 *
 * `updated_at` is left as the server last reported it: later queued changes
 * send it as their conflict-detection baseline.
 */
export function applyQueuedWorkOrderChanges<T extends WorkOrder>(
  workOrder: T,
  queuedItems: readonly OfflineQueueItem[],
  assigneeNameFor?: AssigneeNameLookup,
): T {
  let next = workOrder;

  for (const item of queuedItems) {
    if (!isLiveQueueItem(item)) continue;

    if (item.type === 'work_order_update' && item.payload.workOrderId === workOrder.id) {
      const fields = buildWorkOrderUpdatePayload(item.payload.data);
      delete fields.updated_at;
      next = { ...next, ...fields };
      continue;
    }

    if (item.type === 'work_order_status' && item.payload.workOrderId === workOrder.id) {
      const queuedAt = new Date(item.timestamp).toISOString();
      const fields = buildWorkOrderStatusUpdatePayload(item.payload.newStatus, item.payload.assigneeId);
      delete fields.updated_at;
      if (fields.completed_date) fields.completed_date = queuedAt;
      if (fields.acceptance_date) fields.acceptance_date = queuedAt;
      next = { ...next, ...fields };
      if (item.payload.assigneeId !== undefined) {
        const name = item.payload.assigneeId ? assigneeNameFor?.(item.payload.assigneeId) : undefined;
        next = { ...next, assignee_name: name ?? null, assigneeName: name };
      }
    }
  }

  if (next.assignee_id && !next.assigneeName && assigneeNameFor) {
    const name = assigneeNameFor(next.assignee_id);
    if (name) next = { ...next, assignee_name: next.assignee_name ?? name, assigneeName: name };
  }

  return next;
}
