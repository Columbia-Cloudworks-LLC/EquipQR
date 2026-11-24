/**
 * Parts taken from inventory for a work order with no connection. Each one is
 * a single queue item holding the cost line and the stock deduction; these
 * helpers show both halves on screen until it syncs.
 */
import type { OfflineQueueItem, OfflineQueuePartUseItem } from '@/services/offlineQueueService';
import type { WorkOrderCost } from '@/features/work-orders/types/workOrderCosts';
import { isLiveQueueItem } from '@/features/offline-queue/utils/queuedWorkOrderChanges';

/** A cost line that exists only in the offline queue until it syncs. */
export type QueuedWorkOrderCost = WorkOrderCost & { _isPendingSync?: boolean };

export function isQueuedPartUse(item: OfflineQueueItem): item is OfflineQueuePartUseItem {
  return item.type === 'work_order_part_use' && isLiveQueueItem(item);
}

/** The queued part use behind a cost line id, if it is still waiting to sync. */
export function findQueuedPartUse(
  costId: string,
  queuedItems: readonly OfflineQueueItem[],
): OfflineQueuePartUseItem | undefined {
  return queuedItems.filter(isQueuedPartUse).find(item => item.payload.costId === costId);
}

/** The cost lines queued part uses will add to a work order, oldest first. */
export function queuedPartUseCosts(
  workOrderId: string,
  queuedItems: readonly OfflineQueueItem[],
): QueuedWorkOrderCost[] {
  return queuedItems
    .filter(isQueuedPartUse)
    .filter(item => item.payload.workOrderId === workOrderId)
    .map(item => {
      const queuedAt = new Date(item.timestamp).toISOString();
      const { costId, itemId, description, quantity, unitPriceCents } = item.payload;
      return {
        id: costId,
        work_order_id: workOrderId,
        description,
        quantity,
        unit_price_cents: unitPriceCents,
        total_price_cents: quantity * unitPriceCents,
        inventory_item_id: itemId,
        original_quantity: quantity,
        created_by: item.userId,
        // Shown as "Added by …" on the line, which is where people look.
        created_by_name: 'you, waiting to sync',
        created_at: queuedAt,
        updated_at: queuedAt,
        _isPendingSync: true,
      };
    });
}

/** Saved cost lines plus the queued ones not yet among them. */
export function mergeQueuedPartUseCosts(
  saved: readonly WorkOrderCost[],
  workOrderId: string,
  queuedItems: readonly OfflineQueueItem[],
): QueuedWorkOrderCost[] {
  const queued = queuedPartUseCosts(workOrderId, queuedItems).filter(
    cost => !saved.some(existing => existing.id === cost.id),
  );
  return queued.length > 0 ? [...saved, ...queued] : [...saved];
}
