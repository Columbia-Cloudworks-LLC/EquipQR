// fallow-ignore-file code-duplication
// Duplication rationale: Processor mirrors offlineAware enqueue payloads for replay
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
} from './offlineQueueService';
import { OfflineQueueService } from './offlineQueueService';
import { EquipmentService } from '@/features/equipment/services/EquipmentService';
import { updateEquipmentWorkingHours } from '@/features/equipment/services/equipmentWorkingHoursService';
import { createEquipmentNoteWithImages } from '@/features/equipment/services/equipmentNotesService';
import { createWorkOrderNoteWithImages } from '@/features/work-orders/services/workOrderNotesService';
import {
  createPM,
  updatePM,
  deletePM,
  defaultForkliftChecklist,
  type PMChecklistItem,
} from '@/features/pm-templates/services/preventativeMaintenanceService';
import { pmChecklistTemplatesService } from '@/features/pm-templates/services/pmChecklistTemplatesService';
import { requireAuthClaims } from '@/lib/authClaims';
import { OfflineReplayContext } from './offlineQueueReplayContext';
import {
  cleanupQueueItemBlobs,
  loadQueueItemImageFiles,
} from './offlineQueueProcessorImages';
import { attachWorkOrderCreationImages } from '@/features/work-orders/services/workOrderNotesService';
import {
  parseOfflinePmPlaceholder,
  parseOfflineWorkOrderPlaceholder,
} from './offlineQueuePlaceholders';

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
        estimated_hours: undefined,
        assignee_id: assigneeId,
        team_id: undefined,
        status,
        created_by: claims.sub,
        has_pm: payload.hasPM || false,
      });

      if (!response.success || !response.data?.id) {
        throw new Error(response.error || 'Sync failed: work order create');
      }

      workOrderId = response.data.id;
      replay.registerWorkOrder(item.id, workOrderId, queueService);
      queueService.updatePayload(item.id, { syncedWorkOrderId: workOrderId });
      item.payload.syncedWorkOrderId = workOrderId;
    } else {
      replay.registerWorkOrder(item.id, workOrderId, queueService);
    }

    if (payload.imageRefs?.length && !payload.creationImagesSynced) {
      const images = await loadQueueItemImageFiles(
        item.userId,
        item.organizationId,
        payload.imageRefs,
      );
      await attachWorkOrderCreationImages({
        workOrderId,
        organizationId: item.organizationId,
        images,
        noteContent: payload.creationPhotoNote,
      });
      queueService.updatePayload(item.id, { creationImagesSynced: true });
      item.payload.creationImagesSynced = true;
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
    const { workOrderId, newStatus, serverUpdatedAt } = item.payload;
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
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'completed') {
      updateData.completed_date = new Date().toISOString();
    }
    if (['submitted', 'accepted', 'assigned', 'in_progress'].includes(newStatus)) {
      updateData.completed_date = null;
    }

    const { error } = await supabase
      .from('work_orders')
      .update(updateData)
      .eq('id', resolvedWorkOrderId)
      .eq('organization_id', item.organizationId)
      .select()
      .single();

    if (error) throw error;
    return { success: true };
  }) as QueueItemHandler<never>,

  work_order_note: (async (item: OfflineQueueWorkOrderNoteItem, replay) => {
    await requireAuthClaims('Session expired — please sign in again');

    const { workOrderId, content, hoursWorked = 0, isPrivate = false, machineHours, imageRefs } =
      item.payload;
    const images = await loadQueueItemImageFiles(item.userId, item.organizationId, imageRefs);
    await createWorkOrderNoteWithImages(
      replay.resolveWorkOrderId(workOrderId),
      content,
      hoursWorked,
      isPrivate,
      images,
      item.organizationId,
      machineHours,
    );
    return { success: true };
  }) as QueueItemHandler<never>,

  equipment_create: (async (item: OfflineQueueEquipmentCreateItem, replay, queueService) => {
    const result = await EquipmentService.createQuick(item.organizationId, item.payload);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Sync failed: equipment create');
    }
    const serverId = String(result.data.id);
    replay.registerEquipment(item.id, serverId, queueService);
    return { success: true };
  }) as QueueItemHandler<never>,

  equipment_create_full: (async (item: OfflineQueueEquipmentCreateFullItem, replay, queueService) => {
    const result = await EquipmentService.create(item.organizationId, item.payload);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Sync failed: equipment create (full)');
    }
    const serverId = String(result.data.id);
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

  equipment_note: (async (item: OfflineQueueEquipmentNoteItem, replay) => {
    await requireAuthClaims('Session expired — please sign in again');

    const { equipmentId, content, hoursWorked = 0, isPrivate = false, machineHours, imageRefs } =
      item.payload;
    const images = await loadQueueItemImageFiles(item.userId, item.organizationId, imageRefs);
    await createEquipmentNoteWithImages(
      replay.resolveEquipmentId(equipmentId),
      content,
      hoursWorked,
      isPrivate,
      images,
      item.organizationId,
      machineHours,
    );
    return { success: true };
  }) as QueueItemHandler<never>,

  pm_init: (async (item: OfflineQueuePMInitItem, replay, queueService) => {
    await requireAuthClaims('Session expired — please sign in again');

    const { workOrderId, equipmentId, templateId, checklistData, notes } = item.payload;
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
      replay.registerPm(item.id, pmRecord.id, queueService);
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
  };
}

const HANDLER_MAP = createHandlerMap();

// ─── Processor ───────────────────────────────────────────────────────────────

export interface ProcessResult {
  succeeded: number;
  failed: number;
  remaining: number;
  conflicts: ConflictInfo[];
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
   * 3. Processes each item with conflict detection
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

    this.queueService.compact();

    const replay = new OfflineReplayContext();
    const items = this.queueService.getAll().filter(i => i.status === 'pending');
    let succeeded = 0;
    let failed = 0;
    const conflicts: ConflictInfo[] = [];

    for (const item of items) {
      const outcome = await this.processQueueItem(item, replay);
      if (!outcome) {
        continue;
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
    return { succeeded, failed, remaining, conflicts };
  }

  private async processQueueItem(
    item: OfflineQueueItem,
    replay: OfflineReplayContext,
  ): Promise<{ outcome: 'succeeded' | 'failed' | 'retry'; conflict?: ConflictInfo } | null> {
    if (this._processedInSession.has(item.id)) {
      return null;
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
