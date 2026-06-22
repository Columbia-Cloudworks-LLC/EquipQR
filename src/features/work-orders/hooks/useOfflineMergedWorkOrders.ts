/**
 * Merges server work orders with pending offline queue items so that
 * work orders created offline appear in the list with a "Pending sync" badge.
 */

import { useMemo } from 'react';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { useEquipmentSummaries } from '@/features/equipment/hooks/useEquipment';
import { buildOfflineQueuedWorkOrder } from '@/features/work-orders/utils/buildOfflineQueuedWorkOrder';
import type { MergedWorkOrder } from '@/features/work-orders/types/offlineMergedWorkOrder';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import type { OfflineQueueCreateItem } from '@/services/offlineQueueService';

export {
  OFFLINE_ID_PREFIX,
  isOfflineId,
  type MergedWorkOrder,
} from '@/features/work-orders/types/offlineMergedWorkOrder';

export function useOfflineMergedWorkOrders(
  serverWorkOrders: WorkOrder[],
): MergedWorkOrder[] {
  const offlineCtx = useOfflineQueueOptional();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { data: allEquipment = [] } = useEquipmentSummaries(currentOrganization?.id);

  return useMemo(() => {
    if (!offlineCtx) return serverWorkOrders;

    const pendingCreates = offlineCtx.queuedItems.filter(
      (item): item is OfflineQueueCreateItem =>
        item.type === 'work_order_create' &&
        (item.status === 'pending' || item.status === 'processing'),
    );

    if (pendingCreates.length === 0) return serverWorkOrders;

    const offlineWorkOrders = pendingCreates.map((item) =>
      buildOfflineQueuedWorkOrder({
        item,
        allEquipment,
        userDisplayName: user?.user_metadata?.full_name ?? null,
      }),
    );

    return [...offlineWorkOrders, ...serverWorkOrders];
  }, [serverWorkOrders, allEquipment, user, offlineCtx]);
}
