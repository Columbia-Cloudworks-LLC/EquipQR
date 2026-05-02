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
import { logger } from '@/utils/logger';
import { getErrorMessage } from '@/utils/errorHandling';
import { workOrders, organization, equipment, preventiveMaintenance } from '@/lib/queryKeys';
import type {
  OfflineQueueItem,
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
  WorkOrderServerSnapshot,
} from './offlineQueueService';
import { OfflineQueueService } from './offlineQueueService';
import { EquipmentService } from '@/features/equipment/services/EquipmentService';
import { updateEquipmentWorkingHours } from '@/features/equipment/services/equipmentWorkingHoursService';
import { createEquipmentNoteWithImages } from '@/features/equipment/services/equipmentNotesService';
import { createWorkOrderNoteWithImages } from '@/features/work-orders/services/workOrderNotesService';
import {
  createPM,
  updatePM,
  defaultForkliftChecklist,
  type PMChecklistItem,
} from '@/features/pm-templates/services/preventativeMaintenanceService';
import { pmChecklistTemplatesService } from '@/features/pm-templates/services/pmChecklistTemplatesService';
import { requireAuthClaims } from '@/lib/authClaims';

// ─── Conflict info ───────────────────────────────────────────────────────────

export interface ConflictInfo {
  workOrderId: string;
  type: 'field_conflict' | 'status_conflict';
  details: string;
}

// ─── Handler map ─────────────────────────────────────────────────────────────

type QueueItemHandler<T extends OfflineQueueItem = OfflineQueueItem> = (
  item: T,
) => Promise<{ success: boolean; conflict?: ConflictInfo }>;

const HANDLER_MAP: Record<OfflineQueueItem['type'], QueueItemHandler<never>> = {
  work_order_create: (async (item: OfflineQueueCreateItem) => {
    const claims = await requireAuthClaims('Session expired — please sign in again');

    const service = new WorkOrderService(item.organizationId);
    const payload = item.payload;

    const assigneeId = payload.assigneeId;
    let status: 'submitted' | 'assigned' = 'submitted';
    if (assigneeId) {
      status = 'assigned';
    }

    const response = await service.create({
      title: payload.title,
      description: payload.description,
      equipment_id: payload.equipmentId,
      priority: payload.priority,
      due_date: payload.dueDate,
      estimated_hours: undefined,
      assignee_id: assigneeId,
      team_id: undefined,
      status,
      created_by: claims.sub,
      has_pm: payload.hasPM || false,
    });

    if (!response.success) {
      throw new Error(response.error || 'Sync failed: work order create');
    }

    // Initialize the PM record alongside the work order. This used to be a
    // logged-and-skipped no-op; without it, queued work orders with
    // `hasPM: true` would sync the work order but leave technicians without
    // a PM checklist to fill out, which is the field-critical path. Pull
    // the template's checklist if one was provided, otherwise fall back to
    // the default forklift checklist (matching the online path's behavior
    // in `useInitializePMChecklist.ts`).
    if (payload.hasPM && response.data?.id && payload.equipmentId) {
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
          workOrderId: response.data.id,
          equipmentId: payload.equipmentId,
          organizationId: item.organizationId,
          checklistData,
          notes,
          templateId: payload.pmTemplateId,
        });

        if (!pmRecord) {
          logger.error(
            `PM init failed during offline sync for work order ${response.data.id}; ` +
              'queued work order was created but PM checklist is missing. ' +
              'A user can re-open the work order to trigger auto-init.',
          );
        }
      } catch (pmError) {
        // Don't fail the whole sync — the work order itself succeeded.
        // The PM record can be auto-initialised on next online open via
        // the WorkOrderDetails effect.
        logger.error('Failed to create PM during offline sync', pmError);
      }
    }

    return { success: true };
  }) as QueueItemHandler<never>,

  work_order_update: (async (item: OfflineQueueUpdateItem) => {
    const { workOrderId, data, changedFields, serverUpdatedAt, serverSnapshot } = item.payload;

    // Map of camelCase field names (used in UpdateWorkOrderData / changedFields) to DB column names.
    // Also used to pull the corresponding value out of serverSnapshot and current server state.
    const fieldMap: Record<string, keyof WorkOrderServerSnapshot> = {
      title: 'title',
      description: 'description',
      priority: 'priority',
      dueDate: 'due_date',
      estimatedHours: 'estimated_hours',
      hasPM: 'has_pm',
    };

    // ── Conflict detection (3-way merge) ──────────────────────────────────────
    // We can only do a proper merge when we have:
    //   1. The timestamp of the server state when the user started editing (serverUpdatedAt)
    //   2. The list of fields the user actually changed (changedFields)
    // serverSnapshot is used when available for per-field server-change detection.
    if (serverUpdatedAt && changedFields && changedFields.length > 0) {
      const { data: current, error: fetchErr } = await supabase
        .from('work_orders')
        .select('updated_at, title, description, priority, due_date, estimated_hours, has_pm')
        .eq('id', workOrderId)
        .single();

      if (fetchErr) throw fetchErr;

      if (current && current.updated_at !== serverUpdatedAt) {
        // Server state changed while we were offline — perform field-level merge.
        logger.info(`Conflict detected for WO ${workOrderId}: server updated_at differs`, {
          serverUpdatedAt,
          currentUpdatedAt: current.updated_at,
        });

        const safeUpdate: Record<string, unknown> = {};
        const conflictingFields: string[] = [];

        for (const field of changedFields) {
          const dbCol = fieldMap[field];
          if (!dbCol) continue;

          const ourValue = (data as Record<string, unknown>)[field];
          if (ourValue === undefined) continue;

          // 3-way merge: determine whether the *server* also changed this field.
          // If we have a serverSnapshot we can compare precisely; without it we
          // fall back to server-wins (safe default).
          let serverChangedThisField: boolean;
          if (serverSnapshot && dbCol in serverSnapshot) {
            // Server changed this field iff its current value differs from the baseline.
            serverChangedThisField =
              String(current[dbCol] ?? '') !== String(serverSnapshot[dbCol] ?? '');
          } else {
            // No per-field baseline available — assume server changed everything
            // (conservative / server-wins fallback).
            serverChangedThisField = true;
          }

          if (serverChangedThisField) {
            // Server wins — record the conflict but do not overwrite.
            conflictingFields.push(field);
            logger.info(
              `Field-level conflict on WO ${workOrderId}.${field}: ` +
              `keeping server value "${current[dbCol]}", discarding offline value "${ourValue}"`,
            );
          } else {
            // Server did not touch this field — safe to apply our offline change.
            safeUpdate[dbCol] =
              field === 'dueDate' || field === 'estimatedHours' ? (ourValue || null) : ourValue;
          }
        }

        if (Object.keys(safeUpdate).length > 0) {
          safeUpdate.updated_at = new Date().toISOString();
          const { error } = await supabase
            .from('work_orders')
            .update(safeUpdate)
            .eq('id', workOrderId);

          if (error) throw error;
        }

        if (conflictingFields.length > 0) {
          return {
            success: true,
            conflict: {
              workOrderId,
              type: 'field_conflict' as const,
              details: `Server-side changes won for: ${conflictingFields.join(', ')}. Your offline edits to these fields were discarded.`,
            },
          };
        }

        return { success: true };
      }
    }

    // No conflict — apply all changed fields directly.
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dueDate !== undefined) updateData.due_date = data.dueDate || null;
    if (data.estimatedHours !== undefined) updateData.estimated_hours = data.estimatedHours || null;
    if (data.hasPM !== undefined) updateData.has_pm = data.hasPM;
    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('work_orders')
      .update(updateData)
      .eq('id', workOrderId)
      .select()
      .single();

    if (error) throw error;
    return { success: true };
  }) as QueueItemHandler<never>,

  work_order_status: (async (item: OfflineQueueStatusItem) => {
    const { workOrderId, newStatus, serverUpdatedAt } = item.payload;

    // ── Server-wins conflict detection for status ──
    // If the server status changed while we were offline, server wins.
    if (serverUpdatedAt) {
      const { data: current, error: fetchErr } = await supabase
        .from('work_orders')
        .select('status, updated_at')
        .eq('id', workOrderId)
        .single();

      if (fetchErr) throw fetchErr;

      if (current && current.updated_at !== serverUpdatedAt) {
        // Server state changed — check if status is still compatible
        const serverStatus = current.status;

        // If the server already moved past our intended status, skip
        // e.g., we wanted to mark "in_progress" but it's already "completed"
        const terminalStatuses = ['completed', 'cancelled'];
        if (terminalStatuses.includes(serverStatus) && !terminalStatuses.includes(newStatus)) {
          logger.warn(`Status conflict: WO ${workOrderId} is already ${serverStatus}, skipping offline ${newStatus}`);
          return {
            success: true,
            conflict: {
              workOrderId,
              type: 'status_conflict' as const,
              details: `Work order is already "${serverStatus}" on the server. Your offline "${newStatus}" change was skipped.`,
            },
          };
        }

        // If server is in same or earlier state, apply our change
        logger.info(`Applying offline status ${newStatus} to WO ${workOrderId} (server: ${serverStatus})`);
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
      .eq('id', workOrderId)
      .select()
      .single();

    if (error) throw error;
    return { success: true };
  }) as QueueItemHandler<never>,

  work_order_note: (async (item: OfflineQueueWorkOrderNoteItem) => {
    await requireAuthClaims('Session expired — please sign in again');

    const { workOrderId, content, hoursWorked = 0, isPrivate = false, machineHours } = item.payload;
    await createWorkOrderNoteWithImages(
      workOrderId,
      content,
      hoursWorked,
      isPrivate,
      [],
      item.organizationId,
      machineHours,
    );
    return { success: true };
  }) as QueueItemHandler<never>,

  equipment_create: (async (item: OfflineQueueEquipmentCreateItem) => {
    const result = await EquipmentService.createQuick(item.organizationId, item.payload);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Sync failed: equipment create');
    }
    return { success: true };
  }) as QueueItemHandler<never>,

  equipment_create_full: (async (item: OfflineQueueEquipmentCreateFullItem) => {
    const result = await EquipmentService.create(item.organizationId, item.payload);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Sync failed: equipment create (full)');
    }
    return { success: true };
  }) as QueueItemHandler<never>,

  equipment_update: (async (item: OfflineQueueEquipmentUpdateItem) => {
    const { equipmentId, data } = item.payload;
    const result = await EquipmentService.update(item.organizationId, equipmentId, data);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Sync failed: equipment update');
    }
    return { success: true };
  }) as QueueItemHandler<never>,

  equipment_hours: (async (item: OfflineQueueEquipmentHoursItem) => {
    await updateEquipmentWorkingHours(item.payload);
    return { success: true };
  }) as QueueItemHandler<never>,

  equipment_note: (async (item: OfflineQueueEquipmentNoteItem) => {
    await requireAuthClaims('Session expired — please sign in again');

    const { equipmentId, content, hoursWorked = 0, isPrivate = false, machineHours } = item.payload;
    await createEquipmentNoteWithImages(
      equipmentId,
      content,
      hoursWorked,
      isPrivate,
      [],
      item.organizationId,
      machineHours,
    );
    return { success: true };
  }) as QueueItemHandler<never>,

  pm_init: (async (item: OfflineQueuePMInitItem) => {
    await requireAuthClaims('Session expired — please sign in again');

    const { workOrderId, equipmentId, templateId, checklistData, notes } = item.payload;

    // Resolve placeholder work-order id (`offline-<queue-item-id>`) by
    // refusing to apply: the offline-aware mutation layer should NEVER queue
    // a `pm_init` against an unsynced placeholder because the work-order
    // sync itself takes care of PM init via the `work_order_create` handler
    // above. Surface this clearly so a developer sees the misuse.
    if (workOrderId.startsWith('offline-')) {
      throw new Error(
        `pm_init queued against unsynced offline work order ${workOrderId} ` +
          '— the work_order_create handler is responsible for initial PM creation.',
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
      workOrderId,
      equipmentId,
      organizationId: item.organizationId,
      checklistData: resolvedChecklist,
      notes: resolvedNotes,
      templateId,
    });

    if (!pmRecord) {
      throw new Error(`Sync failed: PM init returned null for work order ${workOrderId}`);
    }

    return { success: true };
  }) as QueueItemHandler<never>,

  pm_update: (async (item: OfflineQueuePMUpdateItem) => {
    await requireAuthClaims('Session expired — please sign in again');

    const {
      pmId,
      serverUpdatedAt,
      checklistData,
      notes,
      status,
      completedAt,
      completedBy,
    } = item.payload;

    if (pmId.startsWith('offline-')) {
      throw new Error(
        `pm_update queued against unsynced offline PM ${pmId} ` +
          '— init must succeed before updates can apply.',
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
        .eq('id', pmId)
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
        logger.warn(`PM ${pmId} reached terminal status '${current.status}' on server; offline edits discarded`);
        return {
          success: true,
          conflict: {
            workOrderId: pmId,
            type: 'status_conflict',
            details: `PM was ${current.status} on the server while offline. Your offline checklist edits were discarded.`,
          },
        };
      }
    }

    const updated = await updatePM(pmId, {
      checklistData,
      notes,
      status,
      completedAt,
      completedBy,
    });

    if (!updated) {
      throw new Error(`Sync failed: PM update returned null for ${pmId}`);
    }

    return { success: true };
  }) as QueueItemHandler<never>,
};

// ─── Processor ───────────────────────────────────────────────────────────────

export interface ProcessResult {
  succeeded: number;
  failed: number;
  remaining: number;
  conflicts: ConflictInfo[];
}

export class OfflineQueueProcessor {
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
    // ── Session refresh guard ──
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      try {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          logger.error('Session refresh failed during offline sync', error);
          return {
            succeeded: 0,
            failed: 0,
            remaining: this.queueService.getPendingCount(),
            conflicts: [],
          };
        }
      } catch {
        logger.error('Session refresh threw during offline sync');
        return {
          succeeded: 0,
          failed: 0,
          remaining: this.queueService.getPendingCount(),
          conflicts: [],
        };
      }
    }

    // ── Compact queue before processing ──
    this.queueService.compact();

    const items = this.queueService.getAll().filter(i => i.status === 'pending');
    let succeeded = 0;
    let failed = 0;
    const conflicts: ConflictInfo[] = [];

    for (const item of items) {
      this.queueService.updateStatus(item.id, 'processing');

      const handler = HANDLER_MAP[item.type];
      if (!handler) {
        logger.error(`No handler for queue item type: ${item.type}`);
        this.queueService.updateStatus(item.id, 'failed', 'Unknown item type');
        failed++;
        continue;
      }

      try {
        const result = await handler(item as never);
        this.queueService.remove(item.id);
        succeeded++;

        if (result.conflict) {
          conflicts.push(result.conflict);
        }
      } catch (error) {
        const newRetryCount = item.retryCount + 1;
        if (newRetryCount >= item.maxRetries) {
          this.queueService.updateStatus(item.id, 'failed', getErrorMessage(error));
          failed++;
        } else {
          this.queueService.updateRetry(item.id, newRetryCount, getErrorMessage(error));
        }
      }
    }

    // Bulk cache invalidation after sync
    if (succeeded > 0) {
      const orgIds = [...new Set(items.map(i => i.organizationId))];
      const hasWorkOrderItems = items.some(i =>
        ['work_order_create', 'work_order_update', 'work_order_status', 'work_order_note'].includes(i.type),
      );
      const hasEquipmentItems = items.some(i =>
        ['equipment_create', 'equipment_create_full', 'equipment_update', 'equipment_hours', 'equipment_note'].includes(i.type),
      );
      const hasPMItems = items.some(i =>
        i.type === 'pm_init' || i.type === 'pm_update' || (i.type === 'work_order_create' && i.payload.hasPM),
      );

      for (const orgId of orgIds) {
        if (hasWorkOrderItems) {
          this.queryClient.invalidateQueries({ queryKey: workOrders.root });
          this.queryClient.invalidateQueries({ queryKey: workOrders.enhanced(orgId) });
          this.queryClient.invalidateQueries({ queryKey: workOrders.optimized(orgId) });
          this.queryClient.invalidateQueries({ queryKey: ['enhanced-work-orders', orgId] });
          this.queryClient.invalidateQueries({ queryKey: ['workOrders', orgId] });
          this.queryClient.invalidateQueries({ queryKey: ['work-orders-filtered-optimized', orgId] });
          this.queryClient.invalidateQueries({ queryKey: ['team-based-work-orders', orgId] });
        }
        if (hasEquipmentItems) {
          this.queryClient.invalidateQueries({ queryKey: equipment.root });
          this.queryClient.invalidateQueries({ queryKey: ['equipment', orgId] });
        }
        if (hasPMItems) {
          // Bulk-invalidate the entire `preventativeMaintenance` namespace so
          // every per-WO and per-WO+equipment cache key picks up the freshly
          // synced PM record without us having to enumerate them.
          this.queryClient.invalidateQueries({ queryKey: preventiveMaintenance.root });
        }
        this.queryClient.invalidateQueries({ queryKey: organization(orgId).dashboardStats() });
        this.queryClient.invalidateQueries({ queryKey: ['dashboardStats', orgId] });
      }
    }

    const remaining = this.queueService.getAll().filter(i => i.status === 'pending').length;
    return { succeeded, failed, remaining, conflicts };
  }
}
