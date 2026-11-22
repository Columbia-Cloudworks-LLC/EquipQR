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
import type { Json } from '@/integrations/supabase/types';

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
    // Several saves made offline sit in the queue as separate items until
    // sync compacts them, so fold them oldest-to-newest to show the latest.
    const pendingUpdate = offlineCtx.queuedItems
      .filter(
        (item): item is OfflineQueuePMUpdateItem =>
          item.type === 'pm_update' &&
          (item.status === 'pending' || item.status === 'processing') &&
          item.payload.pmId === pmPlaceholderId,
      )
      .reduce<OfflineQueuePMUpdateItem | undefined>((merged, item) => {
        if (!merged) return item;
        const payload = { ...merged.payload };
        for (const [key, value] of Object.entries(item.payload)) {
          if (value !== undefined) Object.assign(payload, { [key]: value });
        }
        return { ...item, payload };
      }, undefined);

    const checklistData =
      pendingUpdate?.payload.checklistData ??
      defaultForkliftChecklist.map((item) => ({ ...item, condition: null, notes: '' }));

    const timestamp = new Date(pendingUpdate?.timestamp ?? Date.now()).toISOString();

    return {
      id: pmPlaceholderId,
      work_order_id: workOrderId,
      equipment_id: equipmentId,
      organization_id: pendingUpdate?.organizationId ?? '',
      status: pendingUpdate?.payload.status ?? 'pending',
      checklist_data: checklistData as unknown as Json,
      notes: pendingUpdate?.payload.notes ?? 'PM checklist pending sync.',
      template_id: pendingUpdate?.payload.templateId ?? null,
      created_at: timestamp,
      updated_at: timestamp,
      created_by: pendingUpdate?.userId ?? '',
      created_by_name: null,
      completed_at: pendingUpdate?.payload.completedAt ?? null,
      completed_by: pendingUpdate?.payload.completedBy ?? null,
      completed_by_name: null,
      equipment_working_hours_at_completion: null,
      historical_completion_date: null,
      historical_notes: null,
      is_historical: false,
    };
  }, [workOrderId, equipmentId, offlineCtx]);
}
