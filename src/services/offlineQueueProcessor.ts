/**
 * Offline Queue Processor — V2
 *
 * Re-executes queued work order mutations when the device comes back online.
 *
 * V2 improvements:
 * - Session refresh guard (handles 8+ hour offline periods)
 * - Queue compaction before processing (merges duplicate updates)
 * - Field-level conflict resolution for updates (LWW per field)
 * - Server-wins strategy for status transitions
 * - Sequential FIFO processing to preserve causality
 *
 * @see https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/536
 */

import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WorkOrderService } from '@/features/work-orders/services/workOrderService';
import { syncWorkOrderOfflineUpdate } from './offlineQueueWorkOrderUpdate';
import { logger } from '@/utils/logger';
import { getErrorMessage } from '@/utils/errorHandling';
import { invalidateOfflineSyncQueries } from './offlineQueueInvalidation';
import { ensureActiveOfflineSession } from './offlineQueueSession';
import type {
  OfflineQueueItem,
  OfflineQueueEnqueueInput,
  OfflineQueueCreateItem,
  OfflineQueueUpdateItem,
  OfflineQueueStatusItem,
  OfflineQueueWorkOrderNoteItem,
  OfflineQueueEquipmentCreateItem,
  OfflineQueueEquipmentCreateFullItem,
  OfflineQueueEquipmentUpdateItem,
  OfflineQueueEquipmentHoursItem,
  OfflineQueueEquipmentNoteItem,
  OfflineQueuePMInitItem,
  OfflineQueuePMUpdateItem,
  OfflineQueuePMDeleteItem,
  OfflineQueueEquipmentScanItem,
  OfflineQueueTeamCreateItem,
  OfflineQueueInventoryCreateItem,
  OfflineQueueInventoryUpdateItem,
  OfflineQueueInventoryAdjustItem,
  OfflineQueuePartUseItem,
} from './offlineQueueService';
import type { InventoryQuantityAdjustment } from '@/features/inventory/types/inventory';
import {
  adjustInventoryQuantity,
  createInventoryItem,
  getNewestInventoryMovementTime,
  updateInventoryItem,
} from '@/features/inventory/services/inventoryService';
import { OfflineQueueService } from './offlineQueueService';
import { EquipmentService } from '@/features/equipment/services/EquipmentService';
import { updateEquipmentWorkingHours } from '@/features/equipment/services/equipmentWorkingHoursService';
import {
  createEquipmentNoteWithImages,
  uploadEquipmentNoteImage,
} from '@/features/equipment/services/equipmentNotesService';
import {
  createWorkOrderNoteWithImages,
  setWorkOrderPrimaryImage,
  uploadWorkOrderNoteImage,
} from '@/features/work-orders/services/workOrderNotesService';
import {
  createPM,
  updatePM,
  deletePM,
  defaultForkliftChecklist,
  type PMChecklistItem,
} from '@/features/pm-templates/services/preventativeMaintenanceService';
import { pmChecklistTemplatesService } from '@/features/pm-templates/services/pmChecklistTemplatesService';
import { requireAuthClaims } from '@/lib/authClaims';
import { insertOfflineScan } from '@/features/equipment/services/equipmentQRPermissions';
import { OfflineReplayContext } from './offlineQueueReplayContext';
import {
  cleanupQueueItemBlobs,
  loadQueueItemImageFiles,
} from './offlineQueueProcessorImages';
import { buildWorkOrderStatusUpdatePayload } from '@/features/work-orders/utils/workOrderUpdatePayload';
import {
  parseOfflineEquipPlaceholder,
  parseOfflinePmPlaceholder,
  parseOfflineWorkOrderPlaceholder,
} from './offlineQueuePlaceholders';

/**
 * Most items replayed in one sync run. A queue built up over days without
 * signal drains in runs of this size so a single run stays short, progress is
 * saved between runs, and the device is not asked to do everything at once.
 */
export const OFFLINE_SYNC_BATCH_SIZE = 50;

// ─── Connectivity failures ───────────────────────────────────────────────────

const CONNECTIVITY_ERROR_PATTERN = /Failed to fetch|Load failed|NetworkError|ERR_INTERNET|ERR_NETWORK|net::/i;

/**
 * True when a replay failed because the request never reached the server.
 * Deliberately narrower than `isNetworkError`, which also matches the generic
 * "Operation failed" message services use for server-side rejections — those
 * must keep counting toward the retry limit or they would block the queue.
 */
function isConnectivityFailure(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  return CONNECTIVITY_ERROR_PATTERN.test(getErrorMessage(error));
}

const BLOCKED_BY_FAILED_PARENT_MESSAGE =
  'Waiting on an earlier offline change that failed to sync. Retry after resolving it.';

/** Queue item ids that the placeholder ids inside `value` still point at. */
function collectUnresolvedParentIds(
  value: unknown,
  replay: OfflineReplayContext,
  found: Set<string> = new Set(),
): Set<string> {
  if (typeof value === 'string') {
    const equipParent = parseOfflineEquipPlaceholder(value);
    if (equipParent && replay.resolveEquipmentId(value) === value) found.add(equipParent);
    const pmParent = parseOfflinePmPlaceholder(value);
    if (pmParent && replay.resolvePmId(value) === value) found.add(pmParent);
    const workOrderParent = parseOfflineWorkOrderPlaceholder(value);
    if (workOrderParent && replay.resolveWorkOrderId(value) === value) found.add(workOrderParent);
  } else if (Array.isArray(value)) {
    value.forEach(entry => collectUnresolvedParentIds(entry, replay, found));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach(entry => collectUnresolvedParentIds(entry, replay, found));
  }
  return found;
}

// ─── Equipment create idempotency ────────────────────────────────────────────

type EquipmentCreateQueueItem =
  | OfflineQueueEquipmentCreateItem
  | OfflineQueueEquipmentCreateFullItem;

/** Legacy payloads may still carry syncedEquipmentId inside payload. */
function getSyncedEquipmentId(item: EquipmentCreateQueueItem): string | undefined {
  const legacy = (item.payload as { syncedEquipmentId?: string }).syncedEquipmentId;
  return item.syncedEquipmentId ?? legacy;
}

function persistSyncedEquipmentId(
  item: EquipmentCreateQueueItem,
  serverId: string,
  queueService: OfflineQueueService,
): void {
  const persisted = queueService.updateSyncedEquipmentId(item.id, serverId);
  if (!persisted) {
    throw new Error(
      'Equipment was created on the server but the offline idempotency marker could not be saved. Retry sync after refreshing the page.',
    );
  }
  item.syncedEquipmentId = serverId;
}

// ─── Resumable photo replay ──────────────────────────────────────────────────

type PhotoQueueItem =
  | OfflineQueueCreateItem
  | OfflineQueueWorkOrderNoteItem
  | OfflineQueueEquipmentNoteItem;

/** Save replay progress on the item (in memory and in storage) without moving it in the queue. */
function savePhotoProgress(
  item: PhotoQueueItem,
  queueService: OfflineQueueService,
  progress: Partial<PhotoQueueItem['payload']>,
): void {
  Object.assign(item.payload, progress);
  if (!queueService.updatePayload(item.id, progress, { syncBookkeeping: true })) {
    logger.warn('Could not persist offline photo sync progress', { queueItemId: item.id });
  }
}

/** Create the note once; a retried replay reuses the note it already made. */
async function ensureSyncedNote(
  item: PhotoQueueItem,
  queueService: OfflineQueueService,
  createNote: () => Promise<{ id: string }>,
): Promise<string> {
  if (item.payload.syncedNoteId) return item.payload.syncedNoteId;
  const note = await createNote();
  savePhotoProgress(item, queueService, { syncedNoteId: note.id });
  return note.id;
}

/**
 * Upload the item's photos one at a time, recording each success. Throws on
 * the first photo that does not upload so the item stays queued with its
 * local copies; the next run continues from that photo.
 */
async function uploadPendingPhotos(
  item: PhotoQueueItem,
  queueService: OfflineQueueService,
  uploadOne: (file: File) => Promise<{ id: string }>,
): Promise<void> {
  const uploaded = new Set(item.payload.uploadedBlobKeys ?? []);
  for (const ref of item.payload.imageRefs ?? []) {
    if (uploaded.has(ref.blobKey)) continue;
    const [file] = await loadQueueItemImageFiles(item.userId, item.organizationId, [ref]);
    const image = await uploadOne(file);
    uploaded.add(ref.blobKey);
    savePhotoProgress(item, queueService, {
      uploadedBlobKeys: [...uploaded],
      ...(item.type === 'work_order_create' && !item.payload.creationPrimaryImageId
        ? { creationPrimaryImageId: image.id }
        : {}),
    });
  }
}

// ─── Stock changes ───────────────────────────────────────────────────────────

/**
 * Applies a stock change exactly once across retries.
 *
 * The server applies a change as "add this much", so sending one twice would
 * count the stock twice. Before the first attempt (here, or online before the
 * item was queued) the newest movement already recorded for the inventory
 * item is noted. If that attempt was cut off before its answer arrived, the
 * next one looks for a matching movement recorded after that point: only
 * this change can be it.
 */
async function applyStockChangeOnce(
  item: OfflineQueueInventoryAdjustItem | OfflineQueuePartUseItem,
  queueService: OfflineQueueService,
  adjustment: InventoryQuantityAdjustment,
): Promise<void> {
  const baseline = item.payload.lastMovementBeforeReplay;
  if (baseline === undefined) {
    const newest = await getNewestInventoryMovementTime(item.organizationId, adjustment.itemId);
    item.payload.lastMovementBeforeReplay = newest;
    queueService.updatePayload(item.id, { lastMovementBeforeReplay: newest }, { syncBookkeeping: true });
  } else {
    const { data: recorded, error: lookupError } = await supabase
      .from('inventory_transactions')
      .select('id')
      .eq('inventory_item_id', adjustment.itemId)
      .eq('organization_id', item.organizationId)
      .eq('user_id', item.userId)
      .eq('change_amount', adjustment.delta)
      .eq('notes', adjustment.reason)
      .gt('created_at', baseline)
      .limit(1);
    if (lookupError) throw lookupError;
    if (recorded.length > 0) return;
  }

  try {
    await adjustInventoryQuantity(item.organizationId, adjustment);
  } catch (error) {
    // The server answered and refused (not enough stock, no permission), so
    // nothing was recorded. Forget the reading: the next attempt takes a
    // fresh one, and cannot take a later identical change made by another
    // queued item for its own. Only a lost connection leaves it in doubt.
    if (!isConnectivityFailure(error)) {
      delete item.payload.lastMovementBeforeReplay;
      queueService.updatePayload(item.id, { lastMovementBeforeReplay: undefined }, { syncBookkeeping: true });
    }
    throw error;
  }
}

// ─── Conflict info ───────────────────────────────────────────────────────────

export interface ConflictInfo {
  workOrderId: string;
  type: 'field_conflict' | 'status_conflict';
  details: string;
}

// ─── Handler map ─────────────────────────────────────────────────────────────

type QueueItemHandler<T extends OfflineQueueItem = OfflineQueueItem> = (
  item: T,
  replay: OfflineReplayContext,
  queueService: OfflineQueueService,
) => Promise<{ success: boolean; conflict?: ConflictInfo; followUpItems?: OfflineQueueEnqueueInput[] }>;

function createHandlerMap(): Record<OfflineQueueItem['type'], QueueItemHandler<never>> {
  return {
  work_order_create: (async (item: OfflineQueueCreateItem, replay, queueService) => {
    const claims = await requireAuthClaims('Session expired — please sign in again');

    const service = new WorkOrderService(item.organizationId);
    const payload = item.payload;
    const resolvedEquipmentId = replay.resolveEquipmentId(payload.equipmentId);

    let workOrderId = payload.syncedWorkOrderId;

    if (!workOrderId) {
      const assigneeId = payload.assigneeId;
      let status: 'submitted' | 'assigned' = 'submitted';
      if (assigneeId) {
        status = 'assigned';
      }

      const response = await service.create({
        title: payload.title,
        description: payload.description,
        equipment_id: resolvedEquipmentId,
        priority: payload.priority,
        due_date: payload.dueDate,
        due_date_has_time: payload.dueDateHasTime ?? false,
        estimated_hours: payload.estimatedHours,
        assignee_id: assigneeId,
        status,
        created_by: claims.sub,
        has_pm: payload.hasPM || false,
      });

      if (!response.success || !response.data?.id) {
        throw new Error(response.error || 'Sync failed: work order create');
      }

      workOrderId = response.data.id;
      replay.registerWorkOrder(item.id, workOrderId, queueService);
      queueService.updatePayload(item.id, { syncedWorkOrderId: workOrderId }, { syncBookkeeping: true });
      item.payload.syncedWorkOrderId = workOrderId;
    } else {
      replay.registerWorkOrder(item.id, workOrderId, queueService);
    }

    if (payload.imageRefs?.length && !payload.creationImagesSynced) {
      const creationWorkOrderId = workOrderId;
      const noteId = await ensureSyncedNote(item, queueService, () =>
        createWorkOrderNoteWithImages(
          creationWorkOrderId,
          payload.creationPhotoNote ?? 'Photos attached when this work order was created.',
          0,
          false,
          [],
          item.organizationId,
        ),
      );
      await uploadPendingPhotos(item, queueService, (file) =>
        uploadWorkOrderNoteImage(creationWorkOrderId, noteId, file, item.organizationId),
      );
      if (item.payload.creationPrimaryImageId) {
        await setWorkOrderPrimaryImage(
          creationWorkOrderId,
          item.organizationId,
          item.payload.creationPrimaryImageId,
        );
      }
      savePhotoProgress(item, queueService, { creationImagesSynced: true });
    }

    // Initialize the PM record alongside the work order. This used to be a
    // logged-and-skipped no-op; without it, queued work orders with
    // `hasPM: true` would sync the work order but leave technicians without
    // a PM checklist to fill out, which is the field-critical path. Pull
    // the template's checklist if one was provided, otherwise fall back to
    // the default forklift checklist (matching the online path's behavior
    // in `useInitializePMChecklist.ts`).
    if (payload.hasPM && resolvedEquipmentId) {
      try {
        let checklistData: PMChecklistItem[] = defaultForkliftChecklist;
        let notes = 'PM checklist initialized from queued offline work order.';

        if (payload.pmTemplateId) {
          try {
            const template = await pmChecklistTemplatesService.getTemplate(payload.pmTemplateId);
            if (template && Array.isArray(template.template_data)) {
              const items = template.template_data as unknown as PMChecklistItem[];
              checklistData = items.map((checklistItem) => ({
                ...checklistItem,
                condition: null,
                notes: '',
              }));
              notes = `PM checklist initialized from template: ${template.name}`;
            }
          } catch (templateError) {
            logger.warn('Failed to fetch PM template during offline sync; using default', templateError);
          }
        }

        const pmRecord = await createPM({
          workOrderId,
          equipmentId: resolvedEquipmentId,
          organizationId: item.organizationId,
          checklistData,
          notes,
          templateId: payload.pmTemplateId,
        });

        if (pmRecord?.id) {
          replay.registerPm(item.id, pmRecord.id, queueService);
        }

        if (!pmRecord) {
          logger.warn(
            `PM init returned null during offline sync for work order ${workOrderId}; ` +
              're-queuing pm_init for retry.',
          );
          return {
            success: true,
            followUpItems: [
              {
                type: 'pm_init' as const,
                organizationId: item.organizationId,
                userId: claims.sub,
                payload: {
                  workOrderId,
                  equipmentId: resolvedEquipmentId,
                  templateId: payload.pmTemplateId,
                  placeholderParentId: item.id,
                },
              } as OfflineQueueEnqueueInput,
            ],
          };
        }
      } catch (pmError) {
        // The work order itself succeeded; re-queue a pm_init so the PM
        // checklist is retried independently rather than lost on transient failure.
        logger.warn(
          `PM init failed during offline sync for work order ${workOrderId}; ` +
            'a pm_init item has been re-queued for retry.',
          pmError,
        );
        return {
          success: true,
          followUpItems: [
            {
              type: 'pm_init' as const,
              organizationId: item.organizationId,
              userId: claims.sub,
              payload: {
                workOrderId,
                equipmentId: resolvedEquipmentId,
                templateId: payload.pmTemplateId,
                placeholderParentId: item.id,
              },
            } as OfflineQueueEnqueueInput,
          ],
        };
      }
    }

    return { success: true };
  }) as QueueItemHandler<never>,

  work_order_update: (async (item: OfflineQueueUpdateItem, replay) => {
    const { workOrderId, data, changedFields, serverUpdatedAt, serverSnapshot } = item.payload;
    return syncWorkOrderOfflineUpdate(
      item.organizationId,
      replay.resolveWorkOrderId(workOrderId),
      data,
      {
      changedFields,
      serverUpdatedAt,
      serverSnapshot,
    });
  }) as QueueItemHandler<never>,

  work_order_status: (async (item: OfflineQueueStatusItem, replay) => {
    const { workOrderId, newStatus, assigneeId, serverUpdatedAt } = item.payload;
    const resolvedWorkOrderId = replay.resolveWorkOrderId(workOrderId);

    // ── Server-wins conflict detection for status ──
    // If the server status changed while we were offline, server wins.
    if (serverUpdatedAt) {
      const { data: current, error: fetchErr } = await supabase
        .from('work_orders')
        .select('status, updated_at')
        .eq('id', resolvedWorkOrderId)
        .eq('organization_id', item.organizationId)
        .single();

      if (fetchErr) throw fetchErr;

      if (current && current.updated_at !== serverUpdatedAt) {
        // Server state changed — check if status is still compatible
        const serverStatus = current.status;

        // If the server already moved past our intended status, skip
        // e.g., we wanted to mark "in_progress" but it's already "completed"
        const terminalStatuses = ['completed', 'cancelled'];
        if (terminalStatuses.includes(serverStatus) && !terminalStatuses.includes(newStatus)) {
          logger.warn(`Status conflict: WO ${resolvedWorkOrderId} is already ${serverStatus}, skipping offline ${newStatus}`);
          return {
            success: true,
            conflict: {
              workOrderId: resolvedWorkOrderId,
              type: 'status_conflict' as const,
              details: `Work order is already "${serverStatus}" on the server. Your offline "${newStatus}" change was skipped.`,
            },
          };
        }

        // If server is in same or earlier state, apply our change
        logger.info(`Applying offline status ${newStatus} to WO ${resolvedWorkOrderId} (server: ${serverStatus})`);
      }
    }

    // Apply status change
    const { error } = await supabase
      .from('work_orders')
      .update(buildWorkOrderStatusUpdatePayload(newStatus, assigneeId))
      .eq('id', resolvedWorkOrderId)
      .eq('organization_id', item.organizationId)
      .select()
      .single();

    if (error) throw error;
    return { success: true };
  }) as QueueItemHandler<never>,

  work_order_note: (async (item: OfflineQueueWorkOrderNoteItem, replay, queueService) => {
    await requireAuthClaims('Session expired — please sign in again');

    const { workOrderId, content, hoursWorked = 0, isPrivate = false, machineHours } = item.payload;
    const resolvedWorkOrderId = replay.resolveWorkOrderId(workOrderId);
    const noteId = await ensureSyncedNote(item, queueService, () =>
      createWorkOrderNoteWithImages(
        resolvedWorkOrderId,
        content,
        hoursWorked,
        isPrivate,
        [],
        item.organizationId,
        machineHours,
      ),
    );
    await uploadPendingPhotos(item, queueService, (file) =>
      uploadWorkOrderNoteImage(resolvedWorkOrderId, noteId, file, item.organizationId),
    );
    return { success: true };
  }) as QueueItemHandler<never>,

  equipment_create: (async (item: OfflineQueueEquipmentCreateItem, replay, queueService) => {
    // Idempotent replay: if this exact queue item already created a row in a
    // prior attempt, reuse the server id instead of creating a duplicate.
    const existingId = getSyncedEquipmentId(item);
    if (existingId) {
      replay.registerEquipment(item.id, existingId, queueService);
      return { success: true };
    }
    const result = await EquipmentService.createQuick(item.organizationId, item.payload);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Sync failed: equipment create');
    }
    const serverId = String(result.data.id);
    persistSyncedEquipmentId(item, serverId, queueService);
    replay.registerEquipment(item.id, serverId, queueService);
    return { success: true };
  }) as QueueItemHandler<never>,

  equipment_create_full: (async (item: OfflineQueueEquipmentCreateFullItem, replay, queueService) => {
    const existingId = getSyncedEquipmentId(item);
    if (existingId) {
      replay.registerEquipment(item.id, existingId, queueService);
      return { success: true };
    }
    const result = await EquipmentService.create(item.organizationId, item.payload);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Sync failed: equipment create (full)');
    }
    const serverId = String(result.data.id);
    persistSyncedEquipmentId(item, serverId, queueService);
    replay.registerEquipment(item.id, serverId, queueService);
    return { success: true };
  }) as QueueItemHandler<never>,

  equipment_update: (async (item: OfflineQueueEquipmentUpdateItem, replay) => {
    const { equipmentId, data } = item.payload;
    const result = await EquipmentService.update(
      item.organizationId,
      replay.resolveEquipmentId(equipmentId),
      data,
    );
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Sync failed: equipment update');
    }
    return { success: true };
  }) as QueueItemHandler<never>,

  equipment_hours: (async (item: OfflineQueueEquipmentHoursItem, replay) => {
    await updateEquipmentWorkingHours({
      ...item.payload,
      equipmentId: replay.resolveEquipmentId(item.payload.equipmentId),
    });
    return { success: true };
  }) as QueueItemHandler<never>,

  equipment_note: (async (item: OfflineQueueEquipmentNoteItem, replay, queueService) => {
    await requireAuthClaims('Session expired — please sign in again');

    const { equipmentId, content, hoursWorked = 0, isPrivate = false, machineHours } = item.payload;
    const resolvedEquipmentId = replay.resolveEquipmentId(equipmentId);
    const noteId = await ensureSyncedNote(item, queueService, () =>
      createEquipmentNoteWithImages(
        resolvedEquipmentId,
        content,
        hoursWorked,
        isPrivate,
        [],
        item.organizationId,
        machineHours,
      ),
    );
    await uploadPendingPhotos(item, queueService, (file) =>
      uploadEquipmentNoteImage(resolvedEquipmentId, noteId, file, item.organizationId),
    );
    return { success: true };
  }) as QueueItemHandler<never>,

  pm_init: (async (item: OfflineQueuePMInitItem, replay, queueService) => {
    await requireAuthClaims('Session expired — please sign in again');

    const { workOrderId, equipmentId, templateId, checklistData, notes, placeholderParentId } =
      item.payload;
    const resolvedWorkOrderId = replay.resolveWorkOrderId(workOrderId);
    const resolvedEquipmentId = replay.resolveEquipmentId(equipmentId);

    if (parseOfflineWorkOrderPlaceholder(resolvedWorkOrderId)) {
      throw new Error(
        `pm_init depends on unsynced work order ${workOrderId} — parent create must sync first.`,
      );
    }

    let resolvedChecklist: PMChecklistItem[] = checklistData ?? defaultForkliftChecklist;
    let resolvedNotes = notes ?? 'PM checklist initialized from queued offline session.';

    if (!checklistData && templateId) {
      try {
        const template = await pmChecklistTemplatesService.getTemplate(templateId);
        if (template && Array.isArray(template.template_data)) {
          const items = template.template_data as unknown as PMChecklistItem[];
          resolvedChecklist = items.map((checklistItem) => ({
            ...checklistItem,
            condition: null,
            notes: '',
          }));
          resolvedNotes = `PM checklist initialized from template: ${template.name}`;
        }
      } catch (templateError) {
        logger.warn('Failed to fetch PM template during pm_init sync; using default', templateError);
      }
    }

    const pmRecord = await createPM({
      workOrderId: resolvedWorkOrderId,
      equipmentId: resolvedEquipmentId,
      organizationId: item.organizationId,
      checklistData: resolvedChecklist,
      notes: resolvedNotes,
      templateId,
    });

    if (!pmRecord) {
      throw new Error(`Sync failed: PM init returned null for work order ${resolvedWorkOrderId}`);
    }

    if (pmRecord.id) {
      // Queued checklist edits address the PM as `offline-pm-<work order create id>`,
      // so a retried init must resolve that same placeholder.
      replay.registerPm(placeholderParentId ?? item.id, pmRecord.id, queueService);
    }

    return { success: true };
  }) as QueueItemHandler<never>,

  pm_update: (async (item: OfflineQueuePMUpdateItem, replay) => {
    await requireAuthClaims('Session expired — please sign in again');

    const {
      pmId,
      serverUpdatedAt,
      checklistData,
      notes,
      status,
      templateId,
      completedAt,
      completedBy,
    } = item.payload;

    const resolvedPmId = replay.resolvePmId(pmId);
    if (parseOfflinePmPlaceholder(resolvedPmId)) {
      throw new Error(
        `pm_update depends on unsynced PM ${pmId} — parent init must sync first.`,
      );
    }

    // Conflict detection: if the server's updated_at differs from the
    // baseline the user saw when they began editing offline, prefer the
    // server's `status` (status transitions are non-mergeable) and apply
    // the user's checklist + notes only if the server hasn't completed the
    // PM in the meantime. This matches the work_order_status server-wins
    // strategy used elsewhere in the processor.
    if (serverUpdatedAt) {
      const { data: current, error: fetchErr } = await supabase
        .from('preventative_maintenance')
        .select('updated_at, status')
        .eq('id', resolvedPmId)
        .eq('organization_id', item.organizationId)
        .single();

      if (fetchErr) throw fetchErr;

      const SERVER_TERMINAL_STATUSES = ['completed', 'cancelled'] as const;
      if (
        current &&
        current.updated_at !== serverUpdatedAt &&
        SERVER_TERMINAL_STATUSES.includes(current.status as typeof SERVER_TERMINAL_STATUSES[number]) &&
        !SERVER_TERMINAL_STATUSES.includes(status as typeof SERVER_TERMINAL_STATUSES[number])
      ) {
        // Server moved this PM to a terminal state while the client was
        // offline — discard our edits to avoid overwriting a completed or
        // cancelled record behind the user's back.
        logger.warn(`PM ${resolvedPmId} reached terminal status '${current.status}' on server; offline edits discarded`);
        return {
          success: true,
          conflict: {
            workOrderId: resolvedPmId,
            type: 'status_conflict',
            details: `PM was ${current.status} on the server while offline. Your offline checklist edits were discarded.`,
          },
        };
      }
    }

    const updated = await updatePM(resolvedPmId, {
      checklistData,
      notes,
      status,
      templateId,
      completedAt,
      completedBy,
    }, item.organizationId);

    if (!updated) {
      throw new Error(`Sync failed: PM update returned null for ${resolvedPmId}`);
    }

    return { success: true };
  }) as QueueItemHandler<never>,

  pm_delete: (async (item: OfflineQueuePMDeleteItem, replay) => {
    await requireAuthClaims('Session expired — please sign in again');

    const { pmId } = item.payload;
    const resolvedPmId = replay.resolvePmId(pmId);
    if (parseOfflinePmPlaceholder(resolvedPmId)) {
      throw new Error(
        `pm_delete depends on unsynced PM ${pmId} — parent init must sync first.`,
      );
    }

    const deleted = await deletePM(resolvedPmId, item.organizationId);
    if (!deleted) {
      throw new Error(`Sync failed: PM delete returned false for ${resolvedPmId}`);
    }

    return { success: true };
  }) as QueueItemHandler<never>,

  equipment_scan: (async (item: OfflineQueueEquipmentScanItem, replay) => {
    await insertOfflineScan({
      ...item.payload,
      equipmentId: replay.resolveEquipmentId(item.payload.equipmentId),
    });
    return { success: true };
  }) as QueueItemHandler<never>,

  team_create: (async (item: OfflineQueueTeamCreateItem) => {
    const { team, creatorId } = item.payload;

    // The id was generated on the device. If an earlier attempt already
    // created the team (the answer was lost, or only the membership failed),
    // do not create it again.
    const { data: existing, error: lookupError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', team.id)
      .eq('organization_id', item.organizationId)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (!existing) {
      const { error: teamError } = await supabase
        .from('teams')
        .insert({ ...team, organization_id: item.organizationId });
      if (teamError) throw teamError;
    }

    const { data: membership, error: membershipLookupError } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', team.id)
      .eq('user_id', creatorId)
      .maybeSingle();
    if (membershipLookupError) throw membershipLookupError;

    if (!membership) {
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({ team_id: team.id, user_id: creatorId, role: 'manager' });
      if (memberError) throw memberError;
    }
    return { success: true };
  }) as QueueItemHandler<never>,

  inventory_create: (async (item: OfflineQueueInventoryCreateItem) => {
    const { itemId, formData } = item.payload;

    // Same idempotency rule as team_create: the id comes from the device.
    const { data: existing, error: lookupError } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('id', itemId)
      .eq('organization_id', item.organizationId)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (!existing) {
      await createInventoryItem(item.organizationId, formData, item.userId, itemId);
      return { success: true };
    }

    // An earlier attempt created the item but may have been cut off before
    // linking its equipment or saving its compatibility rules. Both are
    // "replace with this list", so setting them again is safe.
    const { compatibleEquipmentIds, compatibilityRules } = formData;
    if (compatibleEquipmentIds?.length || compatibilityRules?.length) {
      await updateInventoryItem(item.organizationId, itemId, {
        name: formData.name,
        compatibleEquipmentIds,
        compatibilityRules,
      });
    }
    return { success: true };
  }) as QueueItemHandler<never>,

  inventory_update: (async (item: OfflineQueueInventoryUpdateItem) => {
    await updateInventoryItem(item.organizationId, item.payload.itemId, item.payload.formData);
    return { success: true };
  }) as QueueItemHandler<never>,

  inventory_adjust: (async (item: OfflineQueueInventoryAdjustItem, _replay, queueService) => {
    const adjustment = { ...item.payload };
    delete adjustment.lastMovementBeforeReplay;
    await applyStockChangeOnce(item, queueService, adjustment);
    return { success: true };
  }) as QueueItemHandler<never>,

  work_order_part_use: (async (item: OfflineQueuePartUseItem, replay, queueService) => {
    const { costId, itemId, description, quantity, unitPriceCents } = item.payload;
    const workOrderId = replay.resolveWorkOrderId(item.payload.workOrderId);

    // Stock first, as when connected: if the server refuses (not enough in
    // stock) nothing has been written and the whole item fails together.
    if (!item.payload.stockDeducted) {
      await applyStockChangeOnce(item, queueService, {
        itemId,
        delta: -quantity,
        reason: `Used in work order ${workOrderId}`,
        workOrderId,
      });
      item.payload.stockDeducted = true;
      queueService.updatePayload(item.id, { stockDeducted: true }, { syncBookkeeping: true });
    }

    // Then the cost line, under the id chosen on the device. If an earlier
    // attempt already wrote it, there is nothing left to do.
    const { data: existing, error: lookupError } = await supabase
      .from('work_order_costs')
      .select('id')
      .eq('id', costId)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (!existing) {
      const { error: insertError } = await supabase.from('work_order_costs').insert({
        id: costId,
        work_order_id: workOrderId,
        description,
        quantity,
        unit_price_cents: unitPriceCents,
        inventory_item_id: itemId,
        original_quantity: quantity,
        created_by: item.userId,
      });
      if (insertError) throw insertError;
    }
    return { success: true };
  }) as QueueItemHandler<never>,
  };
}

const HANDLER_MAP = createHandlerMap();

// ─── Processor ───────────────────────────────────────────────────────────────

export interface ProcessResult {
  succeeded: number;
  failed: number;
  remaining: number;
  conflicts: ConflictInfo[];
  /** True when the run stopped early because the connection dropped. */
  interrupted?: boolean;
}

export class OfflineQueueProcessor {
  /**
   * In-memory guard: IDs of items whose server-side handler already succeeded
   * this runtime session. If localStorage removal fails, this Set prevents
   * re-processing on subsequent processAll() calls within the same page load,
   * avoiding duplicate server-side side effects (e.g. duplicate work_order_create).
   * The Set is intentionally not persisted — on page reload the queue's own
   * item statuses and the pending filter are the authoritative guard.
   */
  private readonly _processedInSession = new Set<string>();

  constructor(
    private queueService: OfflineQueueService,
    private queryClient: QueryClient,
  ) {}

  /**
   * Process all pending items sequentially in FIFO order.
   *
   * 1. Refreshes auth session (handles 8+ hour offline periods)
   * 2. Compacts the queue (merges duplicate updates)
   * 3. Processes up to OFFLINE_SYNC_BATCH_SIZE items with conflict detection;
   *    `remaining` tells the caller whether to run again for the next batch
   */
  async processAll(): Promise<ProcessResult> {
    if (!(await ensureActiveOfflineSession())) {
      return {
        succeeded: 0,
        failed: 0,
        remaining: this.queueService.getPendingCount(),
        conflicts: [],
      };
    }

    // Anything still marked `processing` was cut off by a closed tab or crash.
    this.queueService.recoverInterrupted();
    this.queueService.compact();

    const replay = new OfflineReplayContext();
    const items = this.queueService
      .getAll()
      .filter(i => i.status === 'pending')
      .slice(0, OFFLINE_SYNC_BATCH_SIZE);
    let succeeded = 0;
    let failed = 0;
    const conflicts: ConflictInfo[] = [];
    let interrupted = false;

    for (const item of items) {
      const outcome = await this.processQueueItem(item, replay);
      if (!outcome) {
        continue;
      }
      if (outcome.outcome === 'interrupted') {
        // The connection dropped. Later items would fail the same way, and
        // running them out of order would break FIFO causality — stop here
        // and leave everything pending for the next run.
        interrupted = true;
        break;
      }
      if (outcome.outcome === 'succeeded') {
        succeeded++;
        if (outcome.conflict) {
          conflicts.push(outcome.conflict);
        }
      } else if (outcome.outcome === 'failed') {
        failed++;
      }
    }

    if (succeeded > 0) {
      invalidateOfflineSyncQueries(this.queryClient, items);
    }

    const remaining = this.queueService.getAll().filter(i => i.status === 'pending').length;
    return { succeeded, failed, remaining, conflicts, interrupted };
  }

  /**
   * An item that still references a placeholder id depends on an earlier
   * create that has not synced. Replaying it now would send a fake id to the
   * server and burn a retry, so hold it until the parent settles.
   */
  private findUnsyncedParent(
    item: OfflineQueueItem,
    replay: OfflineReplayContext,
  ): OfflineQueueItem | undefined {
    const parentIds = collectUnresolvedParentIds(item.payload, replay);
    if (parentIds.size === 0) return undefined;
    return this.queueService.getAll().find(
      candidate =>
        candidate.id !== item.id &&
        (parentIds.has(candidate.id) ||
          (candidate.type === 'pm_init' &&
            candidate.payload.placeholderParentId !== undefined &&
            parentIds.has(candidate.payload.placeholderParentId))),
    );
  }

  private async processQueueItem(
    item: OfflineQueueItem,
    replay: OfflineReplayContext,
  ): Promise<{
    outcome: 'succeeded' | 'failed' | 'retry' | 'interrupted';
    conflict?: ConflictInfo;
  } | null> {
    if (this._processedInSession.has(item.id)) {
      return null;
    }

    const unsyncedParent = this.findUnsyncedParent(item, replay);
    if (unsyncedParent) {
      if (unsyncedParent.status !== 'failed') {
        return null; // parent is still retrying — try again next run
      }
      this.queueService.updateStatus(item.id, 'failed', BLOCKED_BY_FAILED_PARENT_MESSAGE);
      return { outcome: 'failed' };
    }

    this.queueService.updateStatus(item.id, 'processing');

    const handler = HANDLER_MAP[item.type];
    if (!handler) {
      logger.error(`No handler for queue item type: ${item.type}`);
      this.queueService.updateStatus(item.id, 'failed', 'Unknown item type');
      return { outcome: 'failed' };
    }

    try {
      const result = await handler(item as never, replay, this.queueService);
      this._processedInSession.add(item.id);

      if (result.followUpItems?.length) {
        try {
          this.queueService.replaceWithFollowUps(item.id, result.followUpItems);
        } catch (replaceErr) {
          logger.error('Failed to atomically replace queue item with follow-ups', replaceErr);
          try {
            this.queueService.remove(item.id);
          } catch (removeErr) {
            logger.error('Failed to remove processed queue item after follow-up failure', removeErr);
          }
          for (const followUp of result.followUpItems) {
            try {
              this.queueService.enqueue(followUp);
            } catch (enqueueErr) {
              logger.error('Failed to enqueue follow-up item after primary handler succeeded', enqueueErr);
            }
          }
        }
      } else {
        this.queueService.remove(item.id);
      }

      await cleanupQueueItemBlobs(
        item.userId,
        item.organizationId,
        this.queueService.getById(item.id) ?? item,
      );

      return { outcome: 'succeeded', conflict: result.conflict };
    } catch (error) {
      if (isConnectivityFailure(error)) {
        // No signal is not the item's fault: keep it pending without using
        // up one of its retries.
        try {
          this.queueService.releaseToPending(item.id);
        } catch (persistErr) {
          logger.error('Failed to release queue item after connection loss', persistErr);
        }
        return { outcome: 'interrupted' };
      }

      const newRetryCount = item.retryCount + 1;
      if (newRetryCount >= item.maxRetries) {
        try {
          this.queueService.updateStatus(item.id, 'failed', getErrorMessage(error));
        } catch (persistErr) {
          logger.error('Failed to persist failed status for queue item', persistErr);
        }
        return { outcome: 'failed' };
      }

      try {
        this.queueService.updateRetry(item.id, newRetryCount, getErrorMessage(error));
      } catch (persistErr) {
        logger.error('Failed to persist retry state for queue item', persistErr);
      }
      return { outcome: 'retry' };
    }
  }
}
