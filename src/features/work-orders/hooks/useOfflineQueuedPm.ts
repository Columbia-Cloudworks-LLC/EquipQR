/**
 * Synthetic PM record for offline-created work orders pending sync.
 */

import { useMemo } from 'react';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { offlinePmPlaceholder } from '@/services/offlineQueuePlaceholders';
import { parseOfflineQueueItemId } from '@/features/work-orders/hooks/useOfflineQueuedWorkOrder';
import type { OfflineQueuePMUpdateItem } from '@/services/offlineQueueService';
import type { PreventativeMaintenance } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { defaultForkliftChecklist } from '@/features/pm-templates/services/preventativeMaintenanceService';

export function useOfflineQueuedPm(
  workOrderId: string | undefined,
  equipmentId: string | undefined,
): PreventativeMaintenance | null {
  const offlineCtx = useOfflineQueueOptional();

  return useMemo(() => {
    if (!workOrderId || !equipmentId || !offlineCtx) return null;
    const queueItemId = parseOfflineQueueItemId(workOrderId);
    if (!queueItemId) return null;

    const pmPlaceholderId = offlinePmPlaceholder(queueItemId);
    const pendingUpdate = offlineCtx.queuedItems.find(
      (item): item is OfflineQueuePMUpdateItem =>
        item.type === 'pm_update' &&
        (item.status === 'pending' || item.status === 'processing') &&
        item.payload.pmId === pmPlaceholderId,
    );

    const checklistData =
      pendingUpdate?.payload.checklistData ??
      defaultForkliftChecklist.map((item) => ({ ...item, condition: null, notes: '' }));

    return {
      id: pmPlaceholderId,
      work_order_id: workOrderId,
      equipment_id: equipmentId,
      organization_id: pendingUpdate?.organizationId ?? '',
      status: pendingUpdate?.payload.status ?? 'pending',
      checklist_data: checklistData,
      notes: pendingUpdate?.payload.notes ?? 'PM checklist pending sync.',
      template_id: pendingUpdate?.payload.templateId ?? null,
      created_at: new Date(pendingUpdate?.timestamp ?? Date.now()).toISOString(),
      updated_at: new Date(pendingUpdate?.timestamp ?? Date.now()).toISOString(),
      completed_at: pendingUpdate?.payload.completedAt ?? null,
      completed_by: pendingUpdate?.payload.completedBy ?? null,
    } as PreventativeMaintenance;
  }, [workOrderId, equipmentId, offlineCtx]);
}
