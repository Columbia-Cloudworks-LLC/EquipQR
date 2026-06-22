import type { WorkOrder } from '@/features/work-orders/types/workOrder';

export const OFFLINE_ID_PREFIX = 'offline-';

export const isOfflineId = (id: string): boolean => id.startsWith(OFFLINE_ID_PREFIX);

export interface MergedWorkOrder extends WorkOrder {
  _isPendingSync?: boolean;
  _queueItemId?: string;
}
