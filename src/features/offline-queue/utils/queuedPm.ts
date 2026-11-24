import type { OfflineQueueItem } from '@/services/offlineQueueService';
import type { PreventativeMaintenance } from '@/features/pm-templates/services/preventativeMaintenanceService';
import type { Json } from '@/integrations/supabase/types';
import { isLiveQueueItem } from '@/features/offline-queue/utils/queuedWorkOrderChanges';

/** Checklist items are plain data; a JSON round trip gives them the column's type. */
function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value));
}

/**
 * A PM checklist with the edits still waiting in the offline queue applied,
 * oldest first. Without this a checklist completed with no connection reads
 * as unfinished after a reload, and its work order cannot be completed.
 * Returns the same object when nothing is queued for it.
 */
export function applyQueuedPmUpdates(
  pm: PreventativeMaintenance,
  queuedItems: readonly OfflineQueueItem[],
): PreventativeMaintenance {
  let next = pm;
  for (const item of queuedItems) {
    if (item.type !== 'pm_update' || !isLiveQueueItem(item) || item.payload.pmId !== pm.id) continue;
    const { checklistData, notes, status, completedAt, completedBy, templateId } = item.payload;
    next = {
      ...next,
      ...(checklistData !== undefined ? { checklist_data: toJson(checklistData) } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(completedAt !== undefined ? { completed_at: completedAt } : {}),
      ...(completedBy !== undefined ? { completed_by: completedBy } : {}),
      ...(templateId !== undefined ? { template_id: templateId } : {}),
    };
  }
  return next;
}
