/**
 * Offline Queue Service
 *
 * Persists failed work order mutations to localStorage so they can be
 * retried when the device comes back online.
 *
 * Scope: work order create, update, and status-change operations.
 * Images / binary data are explicitly excluded (see containsBinaryData guard).
 *
 * @see https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/536
 */

import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import type { CreateWorkOrderData } from '@/features/work-orders/hooks/useWorkOrderCreation';
import type { UpdateWorkOrderData } from '@/features/work-orders/hooks/useWorkOrderUpdate';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import type {
  QuickEquipmentCreateData,
  EquipmentCreateData,
  EquipmentUpdateData,
} from '@/features/equipment/services/EquipmentService';
import type { UpdateWorkingHoursData } from '@/features/equipment/services/equipmentWorkingHoursService';
import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'equipqr_offline_queue';
const MAX_ITEMS = 50;
const MAX_ITEM_SIZE_BYTES = 50 * 1024; // 50 KB per item
const MAX_QUEUE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB total budget

// ─── Custom Error ────────────────────────────────────────────────────────────

export class OfflineQueuePayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfflineQueuePayloadError';
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type OfflineQueueItemType =
  | 'work_order_create'
  | 'work_order_update'
  | 'work_order_status'
  | 'work_order_note'
  | 'equipment_create'
  | 'equipment_create_full'
  | 'equipment_update'
  | 'equipment_hours'
  | 'equipment_note'
  | 'pm_init'
  | 'pm_update';

export type OfflineQueueItemStatus = 'pending' | 'processing' | 'failed';

interface OfflineQueueItemBase {
  id: string;
  type: OfflineQueueItemType;
  organizationId: string;
  userId: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: OfflineQueueItemStatus;
  payloadSizeBytes: number;
  lastError?: string;
}

export interface OfflineQueueCreateItem extends OfflineQueueItemBase {
  type: 'work_order_create';
  payload: CreateWorkOrderData;
}

/** Field values captured from the server at the moment the user opened the edit form. */
export interface WorkOrderServerSnapshot {
  title?: string | null;
  description?: string | null;
  priority?: string | null;
  due_date?: string | null;
  estimated_hours?: number | null;
  has_pm?: boolean | null;
}

export interface OfflineQueueUpdateItem extends OfflineQueueItemBase {
  type: 'work_order_update';
  payload: {
    workOrderId: string;
    data: UpdateWorkOrderData;
    /** Which fields the user changed — used for field-level conflict resolution. */
    changedFields?: string[];
    /** Snapshot of the work order's updated_at when the edit was made. */
    serverUpdatedAt?: string;
    /**
     * Field values at the moment the user began editing (the "base" in a 3-way merge).
     * Required for true field-level conflict detection: if a field's current server value
     * differs from serverSnapshot[field], the server changed it while we were offline.
     */
    serverSnapshot?: WorkOrderServerSnapshot;
  };
}

export interface OfflineQueueStatusItem extends OfflineQueueItemBase {
  type: 'work_order_status';
  payload: {
    workOrderId: string;
    newStatus: WorkOrderStatus;
    /** Snapshot of the work order's updated_at when the status change was made. */
    serverUpdatedAt?: string;
  };
}

export interface OfflineQueueWorkOrderNoteItem extends OfflineQueueItemBase {
  type: 'work_order_note';
  payload: {
    workOrderId: string;
    content: string;
    hoursWorked?: number;
    machineHours?: number;
    isPrivate?: boolean;
  };
}

export interface OfflineQueueEquipmentCreateItem extends OfflineQueueItemBase {
  type: 'equipment_create';
  payload: QuickEquipmentCreateData;
}

export interface OfflineQueueEquipmentCreateFullItem extends OfflineQueueItemBase {
  type: 'equipment_create_full';
  payload: EquipmentCreateData;
}

export interface OfflineQueueEquipmentUpdateItem extends OfflineQueueItemBase {
  type: 'equipment_update';
  payload: {
    equipmentId: string;
    data: EquipmentUpdateData;
    /** Which fields the user changed — used for field-level conflict resolution. */
    changedFields?: string[];
    /** Snapshot of equipment updated_at when the edit was made. */
    serverUpdatedAt?: string;
  };
}

export interface OfflineQueueEquipmentHoursItem extends OfflineQueueItemBase {
  type: 'equipment_hours';
  payload: UpdateWorkingHoursData;
}

export interface OfflineQueueEquipmentNoteItem extends OfflineQueueItemBase {
  type: 'equipment_note';
  payload: {
    equipmentId: string;
    content: string;
    hoursWorked?: number;
    machineHours?: number;
    isPrivate?: boolean;
  };
}

/**
 * Initialize a PM record on the server when a queued work order with
 * `hasPM: true` finally syncs OR when the user opens an existing online
 * work order while offline and we need to seed a PM stub locally.
 *
 * `workOrderId` must be a server UUID. Placeholder IDs (`offline-*`) are
 * rejected by the offline-aware layer because the `work_order_create`
 * handler is responsible for PM init when the parent work order syncs.
 */
export interface OfflineQueuePMInitItem extends OfflineQueueItemBase {
  type: 'pm_init';
  payload: {
    workOrderId: string;
    equipmentId: string;
    /** Optional template id to seed checklist data from. */
    templateId?: string;
    /** Optional explicit checklist data; falls back to template / default. */
    checklistData?: PMChecklistItem[];
    notes?: string;
  };
}

/**
 * Update a PM record offline. Carries the full latest checklist + notes the
 * user has so the processor can replay the change once online. Conflict
 * resolution: server-wins on `status` transitions; field-level last-write-
 * wins on the checklist payload via `serverUpdatedAt`.
 *
 * `pmId` may be `offline-<queue-item-id>` if the PM was queued for
 * initialisation in the same offline session — the processor resolves the
 * placeholder before applying the update.
 */
export interface OfflineQueuePMUpdateItem extends OfflineQueueItemBase {
  type: 'pm_update';
  payload: {
    pmId: string;
    /**
     * Snapshot of `pm.updated_at` when the user began editing offline.
     * Used by the processor to detect a server-side change while we were
     * offline and choose the appropriate merge strategy.
     */
    serverUpdatedAt?: string;
    checklistData?: PMChecklistItem[];
    notes?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    /** When set, replay updates `preventative_maintenance.template_id` (e.g. template swap). */
    templateId?: string;
    /** Set when status transitions to/from completed. */
    completedAt?: string | null;
    completedBy?: string | null;
  };
}

export type OfflineQueueItem =
  | OfflineQueueCreateItem
  | OfflineQueueUpdateItem
  | OfflineQueueStatusItem
  | OfflineQueueWorkOrderNoteItem
  | OfflineQueueEquipmentCreateItem
  | OfflineQueueEquipmentCreateFullItem
  | OfflineQueueEquipmentUpdateItem
  | OfflineQueueEquipmentHoursItem
  | OfflineQueueEquipmentNoteItem
  | OfflineQueuePMInitItem
  | OfflineQueuePMUpdateItem;

/** The shape callers pass to enqueue — id, retryCount, status etc. are generated. */
export type OfflineQueueEnqueueInput = {
  type: OfflineQueueItemType;
  payload: OfflineQueueItem['payload'];
  organizationId: string;
  userId: string;
};

// ─── Service ─────────────────────────────────────────────────────────────────

export class OfflineQueueService {
  private storageKey: string;

  constructor(userId: string, orgId: string) {
    this.storageKey = `${STORAGE_KEY_PREFIX}_${userId}_${orgId}`;
  }

  // ── Read operations ──────────────────────────────────────────────────────

  /** Return all queue items (any status). */
  getAll(): OfflineQueueItem[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      return JSON.parse(raw) as OfflineQueueItem[];
    } catch {
      logger.error('Failed to read offline queue from localStorage');
      return [];
    }
  }

  /** Number of items with status === 'pending'. */
  getPendingCount(): number {
    return this.getAll().filter(i => i.status === 'pending').length;
  }

  /** Number of items with status === 'failed'. */
  getFailedCount(): number {
    return this.getAll().filter(i => i.status === 'failed').length;
  }

  /** Total item count regardless of status. */
  getCount(): number {
    return this.getAll().length;
  }

  /** First pending item (FIFO). */
  peek(): OfflineQueueItem | undefined {
    return this.getAll().find(i => i.status === 'pending');
  }

  /** Items that have exhausted their retries. */
  getFailedItems(): OfflineQueueItem[] {
    return this.getAll().filter(i => i.status === 'failed');
  }

  // ── Write operations ─────────────────────────────────────────────────────

  /** Add an item to the queue. Throws OfflineQueuePayloadError on validation failure. */
  enqueue(input: OfflineQueueEnqueueInput): OfflineQueueItem {
    const serialized = JSON.stringify(input.payload);
    const sizeBytes = new Blob([serialized]).size;

    // Guard: binary / base64 data
    if (OfflineQueueService.containsBinaryData(serialized)) {
      logger.warn('Blocked offline queue item containing binary data');
      toast.error('Cannot save offline', {
        description: 'This item contains file data that cannot be saved locally.',
      });
      throw new OfflineQueuePayloadError('Payload contains binary data');
    }

    // Guard: single-item size
    if (sizeBytes > MAX_ITEM_SIZE_BYTES) {
      logger.warn(`Offline queue item too large: ${sizeBytes} bytes (limit: ${MAX_ITEM_SIZE_BYTES})`);
      toast.error('Cannot save offline', {
        description: 'This item is too large to save locally. Try again when online.',
      });
      throw new OfflineQueuePayloadError(`Payload exceeds ${MAX_ITEM_SIZE_BYTES / 1024}KB limit`);
    }

    const currentQueue = this.getAll();

    // Guard: total queue storage budget
    const currentTotalSize = currentQueue.reduce((sum, qi) => sum + qi.payloadSizeBytes, 0);
    if (currentTotalSize + sizeBytes > MAX_QUEUE_SIZE_BYTES) {
      logger.warn('Offline queue storage budget exceeded');
      toast.error('Offline queue full', {
        description: 'Clear synced items or wait for connection to free space.',
      });
      throw new OfflineQueuePayloadError('Queue storage budget exceeded');
    }

    // FIFO eviction if at item-count cap
    const queue = [...currentQueue];
    if (queue.length >= MAX_ITEMS) {
      const oldestPendingIdx = queue.findIndex(qi => qi.status === 'pending');
      if (oldestPendingIdx !== -1) {
        queue.splice(oldestPendingIdx, 1);
        toast.warning('Oldest offline item removed to make room for new item.');
      }
    }

    const fullItem: OfflineQueueItem = {
      ...input,
      id: crypto.randomUUID(),
      retryCount: 0,
      maxRetries: 5,
      status: 'pending',
      payloadSizeBytes: sizeBytes,
      timestamp: Date.now(),
    } as OfflineQueueItem;

    queue.push(fullItem);
    this.persist(queue);

    return fullItem;
  }

  /** Remove a single item by id. */
  remove(id: string): void {
    const queue = this.getAll().filter(i => i.id !== id);
    this.persist(queue);
  }

  /**
   * Atomically remove a processed item and append follow-up items in the same
   * localStorage write. This prevents a race where the original item is gone
   * but the follow-ups were never persisted (e.g. quota exceeded between two
   * separate calls). If any follow-up fails validation the entire operation is
   * aborted and the original item stays in the queue so the processor can
   * retry on the next sync cycle.
   */
  replaceWithFollowUps(removeId: string, followUps: OfflineQueueEnqueueInput[]): OfflineQueueItem[] {
    const current = this.getAll();
    const remaining = current.filter(i => i.id !== removeId);

    // Build and validate each follow-up item before touching storage.
    const followUpItems: OfflineQueueItem[] = [];
    for (const input of followUps) {
      const serialized = JSON.stringify(input.payload);
      const sizeBytes = new Blob([serialized]).size;

      if (OfflineQueueService.containsBinaryData(serialized)) {
        throw new OfflineQueuePayloadError('Follow-up payload contains binary data');
      }
      if (sizeBytes > MAX_ITEM_SIZE_BYTES) {
        throw new OfflineQueuePayloadError(`Follow-up payload exceeds ${MAX_ITEM_SIZE_BYTES / 1024}KB limit`);
      }

      followUpItems.push({
        ...input,
        id: crypto.randomUUID(),
        retryCount: 0,
        maxRetries: 5,
        status: 'pending' as const,
        payloadSizeBytes: sizeBytes,
        timestamp: Date.now(),
      } as OfflineQueueItem);
    }

    this.persist([...remaining, ...followUpItems]);
    return followUpItems;
  }

  /** Remove all items. */
  clear(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      logger.error('Failed to clear offline queue');
    }
  }

  /** Mark an item as processing / pending / failed. */
  updateStatus(id: string, status: OfflineQueueItemStatus, lastError?: string): void {
    const queue = this.getAll().map(i => {
      if (i.id !== id) return i;
      return { ...i, status, lastError: lastError ?? i.lastError };
    });
    this.persist(queue);
  }

  /** Increment retryCount and keep status as 'pending' for the next sync attempt. */
  updateRetry(id: string, retryCount: number, lastError?: string): void {
    const queue = this.getAll().map(i => {
      if (i.id !== id) return i;
      return { ...i, retryCount, status: 'pending' as const, lastError: lastError ?? i.lastError };
    });
    this.persist(queue);
  }

  /**
   * Update the payload of an existing queue item (e.g. editing a queued create before sync).
   * Merges `updates` into the existing payload — does NOT replace it entirely.
   * Returns true if the item was found and updated.
   */
  updatePayload(id: string, updates: Record<string, unknown>): boolean {
    const queue = this.getAll();
    const idx = queue.findIndex(i => i.id === id);
    if (idx === -1) return false;

    const item = queue[idx];
    const mergedPayload = { ...item.payload, ...updates };
    const serialized = JSON.stringify(mergedPayload);
    const sizeBytes = new Blob([serialized]).size;

    if (sizeBytes > MAX_ITEM_SIZE_BYTES) {
      logger.warn(`updatePayload: merged payload too large (${sizeBytes} bytes)`);
      return false;
    }

    queue[idx] = {
      ...item,
      payload: mergedPayload as OfflineQueueItem['payload'],
      payloadSizeBytes: sizeBytes,
      timestamp: Date.now(), // bump timestamp so it re-sorts on next compact
    };

    this.persist(queue);
    return true;
  }

  /**
   * Get a single queue item by ID. Returns undefined if not found.
   */
  getById(id: string): OfflineQueueItem | undefined {
    return this.getAll().find(i => i.id === id);
  }

  /**
   * Compact the queue for efficient syncing.
   * - Multiple updates to the same workOrderId are merged into one (latest values per field).
   * - Updates to a queued create (same equipmentId + title match) are folded into the create payload.
   * - Multiple status changes to the same workOrderId keep only the latest.
   *
   * Call this before processAll() to reduce network round-trips after an all-day offline session.
   */
  compact(): void {
    const queue = this.getAll();
    if (queue.length <= 1) return;

    const compacted: OfflineQueueItem[] = [];
    const updateMap = new Map<string, OfflineQueueUpdateItem>();
    const statusMap = new Map<string, OfflineQueueStatusItem>();
    const equipmentUpdateMap = new Map<string, OfflineQueueEquipmentUpdateItem>();
    const equipmentHoursMap = new Map<string, OfflineQueueEquipmentHoursItem>();
    // PM updates collapse by pmId so a 50-item checklist edit session yields
    // one network call. PM inits are NOT compacted because each binds to a
    // distinct work-order/equipment pair.
    const pmUpdateMap = new Map<string, OfflineQueuePMUpdateItem>();

    for (const item of queue) {
      if (item.type === 'work_order_create') {
        // Creates are always kept as-is (they have no workOrderId yet)
        compacted.push(item);
      } else if (item.type === 'work_order_update') {
        const updateItem = item as OfflineQueueUpdateItem;
        const existing = updateMap.get(updateItem.payload.workOrderId);
        if (existing) {
          // Merge: apply later update's fields onto existing
          const mergedData = { ...existing.payload.data, ...updateItem.payload.data };
          const mergedFields = [
            ...new Set([
              ...(existing.payload.changedFields || []),
              ...(updateItem.payload.changedFields || []),
            ]),
          ];
          // Keep the EARLIEST serverUpdatedAt — that is the true baseline the user
          // saw when they began editing. Overwriting it with a later timestamp would
          // cause conflict detection to use the wrong anchor.
          const serverUpdatedAt = existing.payload.serverUpdatedAt ?? updateItem.payload.serverUpdatedAt;
          // Prefer the earlier snapshot for fields that appear in both snapshots;
          // fall back to the later snapshot for fields only it has.
          const serverSnapshot = {
            ...(updateItem.payload.serverSnapshot ?? {}),
            ...(existing.payload.serverSnapshot ?? {}),
          };
          existing.payload = {
            ...existing.payload,
            data: mergedData,
            changedFields: mergedFields,
            serverUpdatedAt,
            serverSnapshot: Object.keys(serverSnapshot).length > 0 ? serverSnapshot : undefined,
          };
          existing.timestamp = updateItem.timestamp; // use latest timestamp
        } else {
          // First update for this WO — clone it into the map
          const clone = JSON.parse(JSON.stringify(updateItem)) as OfflineQueueUpdateItem;
          updateMap.set(updateItem.payload.workOrderId, clone);
        }
      } else if (item.type === 'work_order_status') {
        const statusItem = item as OfflineQueueStatusItem;
        statusMap.set(statusItem.payload.workOrderId, statusItem);
      } else if (item.type === 'equipment_update') {
        const eqUpdateItem = item as OfflineQueueEquipmentUpdateItem;
        const existing = equipmentUpdateMap.get(eqUpdateItem.payload.equipmentId);
        if (existing) {
          const mergedData = { ...existing.payload.data, ...eqUpdateItem.payload.data };
          const mergedFields = [
            ...new Set([
              ...(existing.payload.changedFields || []),
              ...(eqUpdateItem.payload.changedFields || []),
            ]),
          ];
          existing.payload = {
            ...existing.payload,
            data: mergedData,
            changedFields: mergedFields,
          };
          existing.timestamp = eqUpdateItem.timestamp;
        } else {
          const clone = JSON.parse(JSON.stringify(eqUpdateItem)) as OfflineQueueEquipmentUpdateItem;
          equipmentUpdateMap.set(eqUpdateItem.payload.equipmentId, clone);
        }
      } else if (item.type === 'equipment_hours') {
        const eqHoursItem = item as OfflineQueueEquipmentHoursItem;
        equipmentHoursMap.set(eqHoursItem.payload.equipmentId, eqHoursItem);
      } else if (item.type === 'pm_update') {
        const pmUpdateItem = item as OfflineQueuePMUpdateItem;
        const existing = pmUpdateMap.get(pmUpdateItem.payload.pmId);
        if (existing) {
          // Merge: latest checklist + notes win; keep earliest serverUpdatedAt
          // (3-way merge anchor); collapse status to the latest (so an
          // in_progress -> completed flow surfaces as a single completed
          // replay).
          existing.payload = {
            ...existing.payload,
            checklistData:
              pmUpdateItem.payload.checklistData !== undefined
                ? pmUpdateItem.payload.checklistData
                : existing.payload.checklistData,
            notes:
              pmUpdateItem.payload.notes !== undefined
                ? pmUpdateItem.payload.notes
                : existing.payload.notes,
            status:
              pmUpdateItem.payload.status !== undefined
                ? pmUpdateItem.payload.status
                : existing.payload.status,
            templateId:
              pmUpdateItem.payload.templateId !== undefined
                ? pmUpdateItem.payload.templateId
                : existing.payload.templateId,
            completedAt:
              pmUpdateItem.payload.completedAt !== undefined
                ? pmUpdateItem.payload.completedAt
                : existing.payload.completedAt,
            completedBy:
              pmUpdateItem.payload.completedBy !== undefined
                ? pmUpdateItem.payload.completedBy
                : existing.payload.completedBy,
            serverUpdatedAt:
              existing.payload.serverUpdatedAt ?? pmUpdateItem.payload.serverUpdatedAt,
          };
          existing.timestamp = pmUpdateItem.timestamp;
        } else {
          const clone = JSON.parse(JSON.stringify(pmUpdateItem)) as OfflineQueuePMUpdateItem;
          pmUpdateMap.set(pmUpdateItem.payload.pmId, clone);
        }
      } else {
        compacted.push(item);
      }
    }

    for (const item of updateMap.values()) {
      compacted.push(item);
    }
    for (const item of statusMap.values()) {
      compacted.push(item);
    }
    for (const item of equipmentUpdateMap.values()) {
      compacted.push(item);
    }
    for (const item of equipmentHoursMap.values()) {
      compacted.push(item);
    }
    for (const item of pmUpdateMap.values()) {
      compacted.push(item);
    }

    // Sort by original timestamp to preserve FIFO causality
    compacted.sort((a, b) => a.timestamp - b.timestamp);

    this.persist(compacted);
  }

  /** Reset all failed items back to pending so they can be retried. */
  retryFailedItems(): void {
    const queue = this.getAll().map(i => {
      if (i.status !== 'failed') return i;
      return { ...i, status: 'pending' as const, retryCount: 0, lastError: undefined };
    });
    this.persist(queue);
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private persist(queue: OfflineQueueItem[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(queue));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        logger.error('localStorage quota exceeded during offline queue write');
        toast.error('Device storage full', {
          description: 'Cannot save offline. Free storage and try again.',
        });
        throw new OfflineQueuePayloadError('localStorage quota exceeded');
      }
      throw e;
    }
  }

  /**
   * Heuristic: detect base64 image data or data URIs.
   * Made static so it can be tested independently.
   */
  static containsBinaryData(serialized: string): boolean {
    // data URIs: data:image/..., data:application/octet-stream
    if (/data:[a-z]+\/[a-z0-9.+-]+;base64,/i.test(serialized)) return true;
    // Large contiguous base64-like blocks (>10 KB of chars)
    if (/[A-Za-z0-9+/=]{10000,}/.test(serialized)) return true;
    return false;
  }
}
