/**
 * Merges server equipment with pending offline queue items so that
 * equipment created offline appears in the list with a "Pending sync" badge,
 * and edits made offline show on the rows they belong to.
 */

import { useMemo } from 'react';
import type { EquipmentListRow } from '@/features/equipment/services/EquipmentService';
import { useQueuedItems, useQueuedTeamLookup } from '@/features/offline-queue/hooks/useQueuedLookups';
import {
  applyQueuedEquipmentUpdates,
  buildQueuedEquipmentRecord,
  isQueuedEquipmentCreate,
} from '@/features/offline-queue/utils/queuedEquipment';

// ─── Prefix used to identify offline-created items ──────────────────────────
export const OFFLINE_EQUIP_ID_PREFIX = 'offline-equip-';

/** Checks whether an equipment ID represents a pending offline item. */
export const isOfflineEquipmentId = (id: string): boolean =>
  id.startsWith(OFFLINE_EQUIP_ID_PREFIX);

// ─── Extended type ──────────────────────────────────────────────────────────

export interface MergedEquipment extends EquipmentListRow {
  /** True when the item exists only in the offline queue (not yet synced). */
  _isPendingSync?: boolean;
  /** The offline queue item ID — used for editing queued items. */
  _queueItemId?: string;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useOfflineMergedEquipment(
  serverEquipment: EquipmentListRow[],
): MergedEquipment[] {
  const queuedItems = useQueuedItems();
  const teamFor = useQueuedTeamLookup();

  return useMemo(() => {
    if (queuedItems.length === 0) return serverEquipment;

    // Edits still waiting to sync (team, PM template, details) show on the rows they belong to.
    const server = serverEquipment.map((row) => applyQueuedEquipmentUpdates(row, queuedItems, teamFor));
    const offlineEquipment: MergedEquipment[] = queuedItems
      .filter(isQueuedEquipmentCreate)
      .map((item) => applyQueuedEquipmentUpdates(buildQueuedEquipmentRecord(item, teamFor), queuedItems, teamFor));

    // Offline items first, then server data
    return offlineEquipment.length > 0 ? [...offlineEquipment, ...server] : server;
  }, [serverEquipment, queuedItems, teamFor]);
}
