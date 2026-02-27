/**
 * Merges server notes with pending offline queue note items so that
 * notes created offline appear in the notes tab with a "Pending sync" badge.
 *
 * Works for both work order notes and equipment notes.
 */

import { useMemo } from 'react';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { useAuth } from '@/hooks/useAuth';
import type {
  OfflineQueueWorkOrderNoteItem,
  OfflineQueueEquipmentNoteItem,
} from '@/services/offlineQueueService';

// ─── Prefix ─────────────────────────────────────────────────────────────────
export const OFFLINE_NOTE_ID_PREFIX = 'offline-note-';

// ─── Generic note shape that covers both WO and equipment notes ─────────────

export interface MergedNote {
  id: string;
  content: string;
  hours_worked: number;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  author_id: string;
  author_name?: string;
  images?: unknown[];
  /** True when the note exists only in the offline queue. */
  _isPendingSync?: boolean;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Merge server notes with any pending offline note items for a given entity.
 *
 * @param serverNotes - Notes fetched from the server
 * @param entityType - 'work_order' or 'equipment'
 * @param entityId - The work order or equipment ID to filter queue items by
 */
export function useOfflineMergedNotes<T extends { id: string }>(
  serverNotes: T[],
  entityType: 'work_order' | 'equipment',
  entityId: string,
): (T & { _isPendingSync?: boolean })[] {
  const offlineCtx = useOfflineQueueOptional();
  const { user } = useAuth();

  return useMemo(() => {
    if (!offlineCtx || !entityId) return serverNotes;

    const queueType = entityType === 'work_order' ? 'work_order_note' : 'equipment_note';
    const entityKey = entityType === 'work_order' ? 'workOrderId' : 'equipmentId';

    const pendingNotes = offlineCtx.queuedItems.filter(
      (item): item is OfflineQueueWorkOrderNoteItem | OfflineQueueEquipmentNoteItem =>
        item.type === queueType &&
        (item.status === 'pending' || item.status === 'processing') &&
        (item.payload as Record<string, unknown>)[entityKey] === entityId,
    );

    if (pendingNotes.length === 0) return serverNotes;

    const offlineNotes = pendingNotes.map((item) => {
      const payload = item.payload as Record<string, unknown>;
      const now = new Date(item.timestamp).toISOString();

      return {
        id: `${OFFLINE_NOTE_ID_PREFIX}${item.id}`,
        content: (payload.content as string) ?? '',
        hours_worked: (payload.hoursWorked as number) ?? 0,
        is_private: (payload.isPrivate as boolean) ?? false,
        created_at: now,
        updated_at: now,
        author_id: item.userId,
        author_name: user?.user_metadata?.full_name ?? 'You',
        images: [],
        _isPendingSync: true,
      } as T & { _isPendingSync?: boolean };
    });

    // Offline notes first (newest at top)
    return [...offlineNotes, ...serverNotes];
  }, [offlineCtx?.queuedItems, serverNotes, entityType, entityId, user, offlineCtx]);
}
