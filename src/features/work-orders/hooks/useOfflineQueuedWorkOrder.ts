/**
 * Resolve offline-queued work order detail rows for pending sync items.
 */

import { useMemo } from 'react';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { useEquipmentSummaries } from '@/features/equipment/hooks/useEquipment';
import {
  isOfflineId,
  type MergedWorkOrder,
} from '@/features/work-orders/types/offlineMergedWorkOrder';
import { buildOfflineQueuedWorkOrder } from '@/features/work-orders/utils/buildOfflineQueuedWorkOrder';
import type { OfflineQueueCreateItem } from '@/services/offlineQueueService';

export function parseOfflineQueueItemId(workOrderId: string): string | null {
  if (!isOfflineId(workOrderId)) return null;
  return workOrderId.slice('offline-'.length) || null;
}

export function useOfflineQueuedWorkOrder(
  workOrderId: string | undefined,
): MergedWorkOrder | null {
  const offlineCtx = useOfflineQueueOptional();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { data: allEquipment = [] } = useEquipmentSummaries(currentOrganization?.id);

  return useMemo(() => {
    if (!workOrderId || !offlineCtx) return null;
    const queueItemId = parseOfflineQueueItemId(workOrderId);
    if (!queueItemId) return null;

    const item = offlineCtx.queuedItems.find(
      (entry): entry is OfflineQueueCreateItem =>
        entry.id === queueItemId && entry.type === 'work_order_create',
    );
    if (!item) return null;

    return buildOfflineQueuedWorkOrder({
      item,
      allEquipment,
      userDisplayName: user?.user_metadata?.full_name ?? null,
      workOrderId,
    });
  }, [workOrderId, offlineCtx, allEquipment, user]);
}
