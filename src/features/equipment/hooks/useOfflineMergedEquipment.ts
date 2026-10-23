/**
 * Merges server equipment with pending offline queue items so that
 * equipment created offline appears in the list with a "Pending sync" badge.
 *
 * Handles both quick-create and full-create payload shapes.
 */

import { useEffect, useMemo, useState } from 'react';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { loadOfflineBlobObjectUrl } from '@/services/offlineBlobStore';
import type { EquipmentWithTeam } from '@/features/equipment/services/EquipmentService';
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

export interface MergedEquipment extends EquipmentWithTeam {
  /** True when the item exists only in the offline queue (not yet synced). */
  _isPendingSync?: boolean;
  /** The offline queue item ID — used for editing queued items. */
  _queueItemId?: string;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useOfflineMergedEquipment(
  serverEquipment: EquipmentWithTeam[],
): MergedEquipment[] {
  const offlineCtx = useOfflineQueueOptional();
  const [blobPreviewUrls, setBlobPreviewUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!offlineCtx) return;

    const pendingFullCreates = offlineCtx.queuedItems.filter(
      (item): item is OfflineQueueEquipmentCreateFullItem =>
        item.type === 'equipment_create_full' &&
        (item.status === 'pending' || item.status === 'processing') &&
        Array.isArray(item.payload.imageRefs) &&
        item.payload.imageRefs.length > 0,
    );

    if (pendingFullCreates.length === 0) return;

    let cancelled = false;
    const resolvePreviews = async () => {
      const updates: Record<string, string> = {};
      for (const item of pendingFullCreates) {
        if (blobPreviewUrls[item.id]) continue;
        const refs = item.payload.imageRefs ?? [];
        const displayIdx = item.payload.displayImageIndex ?? 0;
        const chosenRef = refs[displayIdx] ?? refs[0];
        if (!chosenRef) continue;
        const url = await loadOfflineBlobObjectUrl(
          item.userId,
          item.organizationId,
          chosenRef.blobKey,
        );
        if (url) {
          updates[item.id] = url;
        }
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setBlobPreviewUrls((prev) => ({ ...prev, ...updates }));
      }
    };

    void resolvePreviews();
    return () => {
      cancelled = true;
    };
  }, [offlineCtx, blobPreviewUrls]);

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
      const { payload } = item;
      const now = new Date(item.timestamp).toISOString();

      if (item.type === 'equipment_create') {
        // Quick create — minimal fields, provide defaults for missing ones
        return {
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
          notes: null,
          custom_attributes: null,
          last_known_location: null,
          installation_date: null,
          warranty_expiration: null,
          default_pm_template_id: null,
          import_id: null,
          customer_id: null,
          assigned_location_address: null,
          assigned_location_city: null,
          assigned_location_state: null,
          assigned_location_country: null,
          assigned_location_lat: null,
          assigned_location_lng: null,
          use_team_location: true,
          created_at: now,
          updated_at: now,
          team: null, // team name resolved from cache would require extra lookup
          _isPendingSync: true,
          _queueItemId: item.id,
        } as MergedEquipment;
      }

      // Full create — all fields present in payload, with local blob preview URL when available
      const optimisticBlobUrl = blobPreviewUrls[item.id] ?? payload.image_url ?? null;
      return {
        id: `${OFFLINE_EQUIP_ID_PREFIX}${item.id}`,
        organization_id: item.organizationId,
        ...payload,
        image_url: optimisticBlobUrl,
        created_at: now,
        updated_at: now,
        team: null,
        _isPendingSync: true,
        _queueItemId: item.id,
      } as MergedEquipment;
    });

    // Offline items first, then server data
    return [...offlineEquipment, ...serverEquipment];
  }, [serverEquipment, offlineCtx, blobPreviewUrls]);
}
