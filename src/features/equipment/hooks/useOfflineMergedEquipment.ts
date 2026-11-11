/**
 * Merges server equipment with pending offline queue items so that
 * equipment created offline appears in the list with a "Pending sync" badge.
 *
 * Handles both quick-create and full-create payload shapes.
 */

import { useMemo } from 'react';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import type { EquipmentListRow } from '@/features/equipment/services/EquipmentService';
import type {
  OfflineQueueEquipmentCreateItem,
  OfflineQueueEquipmentCreateFullItem,
} from '@/services/offlineQueueService';

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
  const offlineCtx = useOfflineQueueOptional();

  return useMemo(() => {
    if (!offlineCtx) return serverEquipment;

    // Filter to equipment_create and equipment_create_full items that are pending/processing
    const pendingCreates = offlineCtx.queuedItems.filter(
      (item): item is OfflineQueueEquipmentCreateItem | OfflineQueueEquipmentCreateFullItem =>
        (item.type === 'equipment_create' || item.type === 'equipment_create_full') &&
        (item.status === 'pending' || item.status === 'processing'),
    );

    if (pendingCreates.length === 0) return serverEquipment;

    const offlineEquipment: MergedEquipment[] = pendingCreates.map((item) => {
      const now = new Date(item.timestamp).toISOString();

      if (item.type === 'equipment_create') {
        const { payload } = item;
        // Quick create — minimal fields, provide defaults for missing ones
        const quickEquipment: MergedEquipment = {
          id: `${OFFLINE_EQUIP_ID_PREFIX}${item.id}`,
          organization_id: item.organizationId,
          name: payload.name,
          manufacturer: payload.manufacturer,
          model: payload.model,
          serial_number: payload.serial_number,
          status: 'active',
          location: '',
          working_hours: payload.working_hours ?? null,
          team_id: payload.team_id,
          image_url: null,
          last_maintenance: null,
          custom_attributes: null,
          // Mirrors EquipmentService.createQuick, which defaults to today.
          installation_date: now.split('T')[0],
          warranty_expiration: null,
          created_at: now,
          updated_at: now,
          team: null, // team name resolved from cache would require extra lookup
          _isPendingSync: true,
          _queueItemId: item.id,
        };
        return quickEquipment;
      }

      // Full create — all fields present in payload
      const { payload } = item;
      const fullEquipment: MergedEquipment = {
        id: `${OFFLINE_EQUIP_ID_PREFIX}${item.id}`,
        organization_id: item.organizationId,
        name: payload.name,
        manufacturer: payload.manufacturer,
        model: payload.model,
        serial_number: payload.serial_number,
        status: payload.status ?? 'active',
        location: payload.location,
        working_hours: payload.working_hours ?? null,
        team_id: payload.team_id ?? null,
        image_url: payload.image_url ?? null,
        last_maintenance: payload.last_maintenance ?? null,
        custom_attributes: payload.custom_attributes ?? null,
        installation_date: payload.installation_date,
        warranty_expiration: payload.warranty_expiration ?? null,
        created_at: now,
        updated_at: now,
        team: null,
        _isPendingSync: true,
        _queueItemId: item.id,
      };
      return fullEquipment;
    });

    // Offline items first, then server data
    return [...offlineEquipment, ...serverEquipment];
  }, [serverEquipment, offlineCtx]);
}
