/**
 * In-memory + persisted placeholder resolution during offline queue replay.
 */

import {
  offlineEquipPlaceholder,
  offlinePmPlaceholder,
  offlineWorkOrderPlaceholder,
  parseOfflineEquipPlaceholder,
  parseOfflinePmPlaceholder,
  parseOfflineWorkOrderPlaceholder,
} from './offlineQueuePlaceholders';
import type { OfflineQueueService } from './offlineQueueService';

export class OfflineReplayContext {
  private readonly equipmentByQueueItem = new Map<string, string>();
  private readonly workOrdersByQueueItem = new Map<string, string>();
  private readonly pmByParentQueueItem = new Map<string, string>();

  registerEquipment(queueItemId: string, serverEquipmentId: string, queue: OfflineQueueService): void {
    this.equipmentByQueueItem.set(queueItemId, serverEquipmentId);
    queue.applyPlaceholderRemap({
      equipment: { [offlineEquipPlaceholder(queueItemId)]: serverEquipmentId },
    });
  }

  registerWorkOrder(queueItemId: string, serverWorkOrderId: string, queue: OfflineQueueService): void {
    this.workOrdersByQueueItem.set(queueItemId, serverWorkOrderId);
    queue.applyPlaceholderRemap({
      workOrders: { [offlineWorkOrderPlaceholder(queueItemId)]: serverWorkOrderId },
    });
  }

  registerPm(parentQueueItemId: string, serverPmId: string, queue: OfflineQueueService): void {
    this.pmByParentQueueItem.set(parentQueueItemId, serverPmId);
    queue.applyPlaceholderRemap({
      pm: { [offlinePmPlaceholder(parentQueueItemId)]: serverPmId },
    });
  }

  resolveEquipmentId(equipmentId: string): string {
    const queueItemId = parseOfflineEquipPlaceholder(equipmentId);
    if (queueItemId && this.equipmentByQueueItem.has(queueItemId)) {
      return this.equipmentByQueueItem.get(queueItemId)!;
    }
    return equipmentId;
  }

  resolveWorkOrderId(workOrderId: string): string {
    const queueItemId = parseOfflineWorkOrderPlaceholder(workOrderId);
    if (queueItemId && this.workOrdersByQueueItem.has(queueItemId)) {
      return this.workOrdersByQueueItem.get(queueItemId)!;
    }
    return workOrderId;
  }

  resolvePmId(pmId: string): string {
    const parentQueueItemId = parseOfflinePmPlaceholder(pmId);
    if (parentQueueItemId && this.pmByParentQueueItem.has(parentQueueItemId)) {
      return this.pmByParentQueueItem.get(parentQueueItemId)!;
    }
    return pmId;
  }
}
