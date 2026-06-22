/**
 * Placeholder ID helpers and queue payload rewriting for offline sync.
 *
 * UI merge hooks synthesize ids like `offline-{queueItemId}` for display.
 * The processor rewrites dependent queue payloads to server UUIDs as parent
 * creates succeed so FIFO replay preserves causality across app restarts.
 */

import type { OfflineQueueItem } from './offlineQueueService';

export const OFFLINE_EQUIP_ID_PREFIX = 'offline-equip-';
export const OFFLINE_WO_ID_PREFIX = 'offline-';
export const OFFLINE_PM_ID_PREFIX = 'offline-pm-';
export const OFFLINE_NOTE_ID_PREFIX = 'offline-note-';

export function offlineEquipPlaceholder(queueItemId: string): string {
  return `${OFFLINE_EQUIP_ID_PREFIX}${queueItemId}`;
}

export function offlineWorkOrderPlaceholder(queueItemId: string): string {
  return `${OFFLINE_WO_ID_PREFIX}${queueItemId}`;
}

export function offlinePmPlaceholder(parentQueueItemId: string): string {
  return `${OFFLINE_PM_ID_PREFIX}${parentQueueItemId}`;
}

export function parseOfflineEquipPlaceholder(id: string): string | null {
  if (!id.startsWith(OFFLINE_EQUIP_ID_PREFIX)) return null;
  return id.slice(OFFLINE_EQUIP_ID_PREFIX.length) || null;
}

/** Parses work-order placeholders but not equipment/note/pm variants. */
export function parseOfflineWorkOrderPlaceholder(id: string): string | null {
  if (!id.startsWith(OFFLINE_WO_ID_PREFIX)) return null;
  if (
    id.startsWith(OFFLINE_EQUIP_ID_PREFIX) ||
    id.startsWith(OFFLINE_NOTE_ID_PREFIX) ||
    id.startsWith(OFFLINE_PM_ID_PREFIX)
  ) {
    return null;
  }
  return id.slice(OFFLINE_WO_ID_PREFIX.length) || null;
}

export function parseOfflinePmPlaceholder(id: string): string | null {
  if (!id.startsWith(OFFLINE_PM_ID_PREFIX)) return null;
  return id.slice(OFFLINE_PM_ID_PREFIX.length) || null;
}

export interface PlaceholderRemap {
  equipment?: Record<string, string>;
  workOrders?: Record<string, string>;
  pm?: Record<string, string>;
}

function replaceString(value: string, remap: PlaceholderRemap): string {
  let next = value;

  if (remap.equipment) {
    for (const [placeholder, serverId] of Object.entries(remap.equipment)) {
      if (next === placeholder) next = serverId;
    }
  }
  if (remap.workOrders) {
    for (const [placeholder, serverId] of Object.entries(remap.workOrders)) {
      if (next === placeholder) next = serverId;
    }
  }
  if (remap.pm) {
    for (const [placeholder, serverId] of Object.entries(remap.pm)) {
      if (next === placeholder) next = serverId;
    }
  }

  return next;
}

function rewriteValue(value: unknown, remap: PlaceholderRemap): unknown {
  if (typeof value === 'string') {
    return replaceString(value, remap);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => rewriteValue(entry, remap));
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(record)) {
      next[key] = rewriteValue(entry, remap);
    }
    return next;
  }
  return value;
}

/** Deep-rewrite all string placeholder ids inside queue item payloads. */
export function rewriteQueueItemsPlaceholders(
  items: OfflineQueueItem[],
  remap: PlaceholderRemap,
): OfflineQueueItem[] {
  return items.map((item) => ({
    ...item,
    payload: rewriteValue(item.payload, remap) as OfflineQueueItem['payload'],
  }));
}
