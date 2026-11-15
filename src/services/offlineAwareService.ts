/**
 * Offline-Aware Service
 *
 * Wraps WorkOrderService, EquipmentService, and notes services with a two-tier
 * offline strategy:
 *  1. FAST PRE-CHECK: If navigator.onLine is false, queue immediately (instant feedback)
 *  2. FALLBACK CATCH: If the Supabase call throws a network error, queue as backup
 *
 * Supports: work orders, equipment create/update, working hours, equipment notes,
 * work order notes (text only — no images).
 *
 * @see https://github.com/Columbia-Cloudworks-LLC/EquipQR/issues/536
 */

import { supabase } from '@/integrations/supabase/client';
import { WorkOrderService } from '@/features/work-orders/services/workOrderService';
import { EquipmentService } from '@/features/equipment/services/EquipmentService';
import { updateEquipmentWorkingHours } from '@/features/equipment/services/equipmentWorkingHoursService';
import { createEquipmentNoteWithImages } from '@/features/equipment/services/equipmentNotesService';
import { createWorkOrderNoteWithImages, type WorkOrderNote } from '@/features/work-orders/services/workOrderNotesService';
import { logger } from '@/utils/logger';
import { isNetworkError } from '@/utils/errorHandling';
import type { CreateWorkOrderData } from '@/features/work-orders/hooks/useWorkOrderCreation';
import type { UpdateWorkOrderData } from '@/features/work-orders/hooks/useWorkOrderUpdate';
import {
  buildWorkOrderStatusUpdatePayload,
  buildWorkOrderUpdatePayload,
} from '@/features/work-orders/utils/workOrderUpdatePayload';
import type { WorkOrder, WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import type { EquipmentNote } from '@/features/equipment/types/equipmentNotes';
import type {
  QuickEquipmentCreateData,
  EquipmentCreateData,
  EquipmentUpdateData,
} from '@/features/equipment/services/EquipmentService';
import type { UpdateWorkingHoursData } from '@/features/equipment/services/equipmentWorkingHoursService';
import { OfflineQueueService, OfflineQueuePayloadError } from './offlineQueueService';
import type {
  OfflineQueueEnqueueInput,
  WorkOrderServerSnapshot,
  OfflineQueueImageRef,
} from './offlineQueueService';
import { stageQueueImageRefs } from './offlineQueueImageRefs';
import type {
  PMChecklistItem,
  PreventativeMaintenance,
  UpdatePMData,
} from '@/features/pm-templates/services/preventativeMaintenanceService';
import {
  createPM,
  updatePM,
  deletePM,
} from '@/features/pm-templates/services/preventativeMaintenanceService';

// ─── Result type ─────────────────────────────────────────────────────────────

export interface OfflineAwareResult<T> {
  data: T | null;
  queuedOffline: boolean;
  queueItemId?: string;
}

// ─── Queue helpers ───────────────────────────────────────────────────────────

const OFFLINE_SAVE_FAILED_MESSAGE = 'Cannot save offline — please try again when connected.';

/** Log lines for one queued mutation. */
interface QueueLog {
  /** `logger.info` message once the item is in the queue. */
  queued: string;
  /** `logger.error` message when queueing fails for any reason other than payload validation. */
  failed: string;
  /** Extra fields for the `queued` log line (the queue item id is always included). */
  context?: Record<string, unknown>;
}

/**
 * Payload validation errors pass through unchanged (the data cannot be saved
 * offline either). Anything else is logged and replaced by a generic
 * "cannot save offline" error that keeps the original as `cause`.
 */
function toEnqueueFailure(err: unknown, failedMessage: string): Error {
  if (err instanceof OfflineQueuePayloadError) return err;
  logger.error(failedMessage, err);
  return Object.assign(new Error(OFFLINE_SAVE_FAILED_MESSAGE), { cause: err });
}

/** Names of the fields the caller actually set, for field-level conflict resolution on replay. */
function definedFieldNames(data: object): string[] {
  return Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key);
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class OfflineAwareWorkOrderService {
  private service: WorkOrderService;
  private queueService: OfflineQueueService;

  /**
   * @param orgId - Organization ID (always available inside dashboard)
   * @param userId - User ID (always available inside ProtectedRoute)
   *
   * The queue service is created internally using userId + orgId.
   * It writes to the same localStorage key as the context's instance,
   * so the PendingSyncBanner will see the queued items after a refresh().
   */
  constructor(
    private orgId: string,
    private userId: string,
  ) {
    this.service = new WorkOrderService(orgId);
    this.queueService = new OfflineQueueService(userId, orgId);
  }

  // ── Create ─────────────────────────────────────────────────────────────

  async createWorkOrder(
    data: CreateWorkOrderData,
    resolvedAssigneeId?: string,
  ): Promise<OfflineAwareResult<WorkOrder>> {
    // ── TIER 1: Fast pre-check — skip network entirely when offline ──
    if (!navigator.onLine) {
      return this.queueCreate(data, resolvedAssigneeId);
    }

    // ── TIER 2: Attempt real call, catch network errors as fallback ──
    try {
      const assigneeId = resolvedAssigneeId ?? data.assigneeId;
      let status: 'submitted' | 'assigned' = 'submitted';
      if (assigneeId) status = 'assigned';

      const response = await this.service.create({
        title: data.title,
        description: data.description,
        equipment_id: data.equipmentId,
        priority: data.priority,
        due_date: data.dueDate,
        due_date_has_time: data.dueDateHasTime ?? false,
        estimated_hours: data.estimatedHours,
        assignee_id: assigneeId,
        status,
        created_by: this.userId,
        has_pm: data.hasPM || false,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create work order');
      }

      return { data: response.data, queuedOffline: false };
    } catch (error) {
      // Fallback: if it's a network error, queue locally
      if (isNetworkError(error)) {
        return this.queueCreate(data, resolvedAssigneeId);
      }
      throw error;
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────

  async updateWorkOrder(
    workOrderId: string,
    data: UpdateWorkOrderData,
    serverUpdatedAt?: string,
    serverSnapshot?: WorkOrderServerSnapshot,
  ): Promise<OfflineAwareResult<Record<string, unknown>>> {
    // ── TIER 1: Fast pre-check ──
    if (!navigator.onLine) {
      return this.queueUpdate(workOrderId, data, serverUpdatedAt, serverSnapshot);
    }

    // ── TIER 2: Attempt real call ──
    try {
      const updateData = buildWorkOrderUpdatePayload(data);

      const { data: result, error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', workOrderId)
        .select()
        .single();

      if (error) throw error;
      return { data: result, queuedOffline: false };
    } catch (error) {
      if (isNetworkError(error)) {
        return this.queueUpdate(workOrderId, data, serverUpdatedAt, serverSnapshot);
      }
      throw error;
    }
  }

  // ── Status Change ──────────────────────────────────────────────────────

  /**
   * @param assigneeId - `undefined` leaves the assignee unchanged, `null`
   *   unassigns, a user id assigns ("Assign & Start").
   */
  async updateStatus(
    workOrderId: string,
    newStatus: WorkOrderStatus,
    serverUpdatedAt?: string,
    assigneeId?: string | null,
  ): Promise<OfflineAwareResult<Record<string, unknown>>> {
    // ── TIER 1: Fast pre-check ──
    if (!navigator.onLine) {
      return this.queueStatus(workOrderId, newStatus, serverUpdatedAt, assigneeId);
    }

    // ── TIER 2: Attempt real call ──
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .update(buildWorkOrderStatusUpdatePayload(newStatus, assigneeId))
        .eq('id', workOrderId)
        .eq('organization_id', this.orgId)
        .select()
        .single();

      if (error) throw error;
      return { data, queuedOffline: false };
    } catch (error) {
      if (isNetworkError(error)) {
        return this.queueStatus(workOrderId, newStatus, serverUpdatedAt, assigneeId);
      }
      throw error;
    }
  }

  // ── Private queue helpers ──────────────────────────────────────────────

  /** Adds one mutation to the offline queue for this user and organization. */
  private enqueueOffline<T>(
    entry: Pick<OfflineQueueEnqueueInput, 'type' | 'payload'>,
    log: QueueLog,
  ): OfflineAwareResult<T> {
    try {
      const item = this.queueService.enqueue({
        ...entry,
        organizationId: this.orgId,
        userId: this.userId,
      });
      logger.info(log.queued, { queueItemId: item.id, ...log.context });
      return { data: null, queuedOffline: true, queueItemId: item.id };
    } catch (err) {
      throw toEnqueueFailure(err, log.failed);
    }
  }

  /** Stores photos in the offline blob store so a queued item can reference them. */
  private async stageImages(images: File[], failedMessage: string): Promise<OfflineQueueImageRef[]> {
    try {
      return await stageQueueImageRefs(this.userId, this.orgId, images);
    } catch (err) {
      throw toEnqueueFailure(err, failedMessage);
    }
  }

  private async queueCreate(
    data: CreateWorkOrderData,
    resolvedAssigneeId?: string,
  ): Promise<OfflineAwareResult<WorkOrder>> {
    const failed = 'Failed to enqueue offline create';
    const { images, ...payloadWithoutImages } = data;
    const imageRefs = images?.length ? await this.stageImages(images, failed) : undefined;

    return this.enqueueOffline(
      {
        type: 'work_order_create',
        payload: {
          ...payloadWithoutImages,
          assigneeId: resolvedAssigneeId ?? data.assigneeId,
          imageRefs,
        },
      },
      { queued: 'Work order create queued offline', failed },
    );
  }

  private queueUpdate(
    workOrderId: string,
    data: UpdateWorkOrderData,
    serverUpdatedAt?: string,
    serverSnapshot?: WorkOrderServerSnapshot,
  ): OfflineAwareResult<Record<string, unknown>> {
    return this.enqueueOffline(
      {
        type: 'work_order_update',
        payload: {
          workOrderId,
          data,
          changedFields: definedFieldNames(data),
          serverUpdatedAt,
          serverSnapshot,
        },
      },
      {
        queued: 'Work order update queued offline',
        failed: 'Failed to enqueue offline update',
        context: { workOrderId },
      },
    );
  }

  private queueStatus(
    workOrderId: string,
    newStatus: WorkOrderStatus,
    serverUpdatedAt?: string,
    assigneeId?: string | null,
  ): OfflineAwareResult<Record<string, unknown>> {
    return this.enqueueOffline(
      {
        type: 'work_order_status',
        payload: {
          workOrderId,
          newStatus,
          serverUpdatedAt,
          ...(assigneeId !== undefined ? { assigneeId } : {}),
        },
      },
      {
        queued: 'Work order status queued offline',
        failed: 'Failed to enqueue offline status update',
        context: { workOrderId, newStatus },
      },
    );
  }

  // ── Equipment Create (Quick) ─────────────────────────────────────────────

  async createEquipmentQuick(
    data: QuickEquipmentCreateData,
  ): Promise<OfflineAwareResult<{ id: string; [key: string]: unknown }>> {
    return this.createEquipment(
      () => EquipmentService.createQuick(this.orgId, data),
      () => this.queueEquipmentCreateQuick(data),
    );
  }

  // ── Equipment Create (Full) ──────────────────────────────────────────────

  async createEquipmentFull(
    data: EquipmentCreateData,
  ): Promise<OfflineAwareResult<{ id: string; [key: string]: unknown }>> {
    return this.createEquipment(
      () => EquipmentService.create(this.orgId, data),
      () => this.queueEquipmentCreateFull(data),
    );
  }

  /** Shared online/offline flow for the quick and full equipment create forms. */
  private async createEquipment(
    create: () => ReturnType<typeof EquipmentService.create>,
    queue: () => OfflineAwareResult<{ id: string; [key: string]: unknown }>,
  ): Promise<OfflineAwareResult<{ id: string; [key: string]: unknown }>> {
    if (!navigator.onLine) return queue();
    try {
      const result = await create();
      if (!result.success || !result.data) throw new Error(result.error || 'Failed to create equipment');
      return { data: result.data, queuedOffline: false };
    } catch (error) {
      if (isNetworkError(error)) return queue();
      throw error;
    }
  }

  // ── Equipment Update ────────────────────────────────────────────────────

  async updateEquipment(
    equipmentId: string,
    data: EquipmentUpdateData,
    serverUpdatedAt?: string,
  ): Promise<OfflineAwareResult<Record<string, unknown>>> {
    if (!navigator.onLine) return this.queueEquipmentUpdate(equipmentId, data, serverUpdatedAt);
    try {
      const result = await EquipmentService.update(this.orgId, equipmentId, data);
      if (!result.success || !result.data) throw new Error(result.error || 'Failed to update equipment');
      return { data: result.data, queuedOffline: false };
    } catch (error) {
      if (isNetworkError(error)) return this.queueEquipmentUpdate(equipmentId, data, serverUpdatedAt);
      throw error;
    }
  }

  // ── Working Hours ────────────────────────────────────────────────────────

  async updateWorkingHours(
    data: UpdateWorkingHoursData,
  ): Promise<OfflineAwareResult<unknown>> {
    if (!navigator.onLine) return this.queueEquipmentHours(data);
    try {
      await updateEquipmentWorkingHours(data);
      return { data: null, queuedOffline: false };
    } catch (error) {
      if (isNetworkError(error)) return this.queueEquipmentHours(data);
      throw error;
    }
  }

  // ── Equipment Note (text only) ──────────────────────────────────────────

  async createEquipmentNote(
    equipmentId: string,
    content: string,
    hoursWorked: number = 0,
    isPrivate: boolean = false,
    machineHours?: number,
    images: File[] = [],
  ): Promise<OfflineAwareResult<EquipmentNote>> {
    if (!navigator.onLine) {
      return this.queueEquipmentNote(equipmentId, content, hoursWorked, isPrivate, machineHours, images);
    }
    try {
      const note = await createEquipmentNoteWithImages(
        equipmentId,
        content,
        hoursWorked,
        isPrivate,
        images,
        this.orgId,
        machineHours,
      );
      return { data: note, queuedOffline: false };
    } catch (error) {
      if (isNetworkError(error)) {
        return this.queueEquipmentNote(
          equipmentId,
          content,
          hoursWorked,
          isPrivate,
          machineHours,
          images,
        );
      }
      throw error;
    }
  }

  // ── Work Order Note (text only) ──────────────────────────────────────────

  async createWorkOrderNote(
    workOrderId: string,
    content: string,
    hoursWorked: number = 0,
    isPrivate: boolean = false,
    machineHours?: number,
    images: File[] = [],
  ): Promise<OfflineAwareResult<WorkOrderNote>> {
    if (!navigator.onLine) {
      return this.queueWorkOrderNote(
        workOrderId,
        content,
        hoursWorked,
        isPrivate,
        machineHours,
        images,
      );
    }
    try {
      const note = await createWorkOrderNoteWithImages(
        workOrderId,
        content,
        hoursWorked,
        isPrivate,
        images,
        this.orgId,
        machineHours,
      );
      return { data: note, queuedOffline: false };
    } catch (error) {
      if (isNetworkError(error)) {
        return this.queueWorkOrderNote(
          workOrderId,
          content,
          hoursWorked,
          isPrivate,
          machineHours,
          images,
        );
      }
      throw error;
    }
  }

  // ── Private queue helpers (equipment & notes) ─────────────────────────────

  private queueEquipmentCreateQuick(
    data: QuickEquipmentCreateData,
  ): OfflineAwareResult<{ id: string; [key: string]: unknown }> {
    return this.enqueueOffline(
      { type: 'equipment_create', payload: data },
      {
        queued: 'Equipment create (quick) queued offline',
        failed: 'Failed to enqueue offline equipment create',
      },
    );
  }

  private queueEquipmentCreateFull(
    data: EquipmentCreateData,
  ): OfflineAwareResult<{ id: string; [key: string]: unknown }> {
    return this.enqueueOffline(
      { type: 'equipment_create_full', payload: data },
      {
        queued: 'Equipment create (full) queued offline',
        failed: 'Failed to enqueue offline equipment create',
      },
    );
  }

  private queueEquipmentUpdate(
    equipmentId: string,
    data: EquipmentUpdateData,
    serverUpdatedAt?: string,
  ): OfflineAwareResult<Record<string, unknown>> {
    return this.enqueueOffline(
      {
        type: 'equipment_update',
        payload: {
          equipmentId,
          data,
          changedFields: definedFieldNames(data),
          serverUpdatedAt: serverUpdatedAt || new Date().toISOString(),
        },
      },
      {
        queued: 'Equipment update queued offline',
        failed: 'Failed to enqueue offline equipment update',
        context: { equipmentId },
      },
    );
  }

  private queueEquipmentHours(data: UpdateWorkingHoursData): OfflineAwareResult<unknown> {
    return this.enqueueOffline(
      { type: 'equipment_hours', payload: data },
      {
        queued: 'Equipment hours queued offline',
        failed: 'Failed to enqueue offline equipment hours',
        context: { equipmentId: data.equipmentId },
      },
    );
  }

  private async queueEquipmentNote(
    equipmentId: string,
    content: string,
    hoursWorked: number,
    isPrivate: boolean,
    machineHours?: number,
    images: File[] = [],
  ): Promise<OfflineAwareResult<EquipmentNote>> {
    const failed = 'Failed to enqueue offline equipment note';
    const imageRefs = images.length ? await this.stageImages(images, failed) : undefined;

    return this.enqueueOffline(
      {
        type: 'equipment_note',
        payload: {
          equipmentId,
          content,
          hoursWorked,
          isPrivate,
          ...(machineHours !== undefined ? { machineHours } : {}),
          ...(imageRefs?.length ? { imageRefs } : {}),
        },
      },
      { queued: 'Equipment note queued offline', failed, context: { equipmentId } },
    );
  }

  private async queueWorkOrderNote(
    workOrderId: string,
    content: string,
    hoursWorked: number,
    isPrivate: boolean,
    machineHours?: number,
    images: File[] = [],
  ): Promise<OfflineAwareResult<WorkOrderNote>> {
    const failed = 'Failed to enqueue offline work order note';
    const imageRefs = images.length ? await this.stageImages(images, failed) : undefined;

    return this.enqueueOffline(
      {
        type: 'work_order_note',
        payload: {
          workOrderId,
          content,
          hoursWorked,
          isPrivate,
          ...(machineHours !== undefined ? { machineHours } : {}),
          ...(imageRefs?.length ? { imageRefs } : {}),
        },
      },
      { queued: 'Work order note queued offline', failed, context: { workOrderId } },
    );
  }

  // ── Preventative Maintenance — init ──────────────────────────────────────

  /**
   * Initialize a PM record for a work order + equipment pair. When offline,
   * the call is queued for replay. Useful for the auto-init effect in
   * `WorkOrderDetails` when a technician opens a `has_pm = true` work
   * order on a flaky cellular link.
   */
  async initPM(input: {
    workOrderId: string;
    equipmentId: string;
    templateId?: string;
    checklistData: PMChecklistItem[];
    notes?: string;
  }): Promise<OfflineAwareResult<PreventativeMaintenance>> {
    if (!navigator.onLine) {
      return this.queuePMInit(input);
    }
    try {
      const pm = await createPM({
        workOrderId: input.workOrderId,
        equipmentId: input.equipmentId,
        organizationId: this.orgId,
        checklistData: input.checklistData,
        notes: input.notes,
        templateId: input.templateId,
      });
      if (!pm) throw new Error('Failed to create PM');
      return { data: pm, queuedOffline: false };
    } catch (error) {
      if (isNetworkError(error)) return this.queuePMInit(input);
      throw error;
    }
  }

  // ── Preventative Maintenance — update ────────────────────────────────────

  /**
   * Update a PM record. Offline edits queue under the `pm_update` type and
   * collapse via `OfflineQueueService.compact()` so a 50-item checklist
   * session syncs as a single network call.
   *
   * `serverUpdatedAt` is the snapshot of `pm.updated_at` the user saw when
   * they began editing — the processor uses it for server-wins conflict
   * detection on `status` (a server-side completion always wins).
   */
  async updatePM(
    pmId: string,
    data: UpdatePMData,
    serverUpdatedAt?: string,
  ): Promise<OfflineAwareResult<PreventativeMaintenance>> {
    if (!navigator.onLine) {
      return this.queuePMUpdate(pmId, data, serverUpdatedAt);
    }
    try {
      const pm = await updatePM(pmId, data, this.orgId);
      if (!pm) throw new Error('Failed to update PM');
      return { data: pm, queuedOffline: false };
    } catch (error) {
      if (isNetworkError(error)) return this.queuePMUpdate(pmId, data, serverUpdatedAt);
      throw error;
    }
  }

  // ── Preventative Maintenance — delete ────────────────────────────────────

  async deletePM(
    pmId: string,
  ): Promise<OfflineAwareResult<null>> {
    if (!navigator.onLine) {
      return this.queuePMDelete(pmId);
    }
    try {
      const deleted = await deletePM(pmId, this.orgId);
      if (!deleted) throw new Error('Failed to delete PM');
      return { data: null, queuedOffline: false };
    } catch (error) {
      if (isNetworkError(error)) return this.queuePMDelete(pmId);
      throw error;
    }
  }

  private queuePMInit(input: {
    workOrderId: string;
    equipmentId: string;
    templateId?: string;
    checklistData: PMChecklistItem[];
    notes?: string;
  }): OfflineAwareResult<PreventativeMaintenance> {
    return this.enqueueOffline(
      {
        type: 'pm_init',
        payload: {
          workOrderId: input.workOrderId,
          equipmentId: input.equipmentId,
          templateId: input.templateId,
          checklistData: input.checklistData,
          notes: input.notes,
        },
      },
      {
        queued: 'PM init queued offline',
        failed: 'Failed to enqueue offline PM init',
        context: { workOrderId: input.workOrderId },
      },
    );
  }

  private queuePMUpdate(
    pmId: string,
    data: UpdatePMData,
    serverUpdatedAt?: string,
  ): OfflineAwareResult<PreventativeMaintenance> {
    return this.enqueueOffline(
      {
        type: 'pm_update',
        payload: {
          pmId,
          serverUpdatedAt,
          checklistData: data.checklistData,
          notes: data.notes,
          status: data.status,
          templateId: data.templateId,
          completedAt: data.completedAt,
          completedBy: data.completedBy,
        },
      },
      {
        queued: 'PM update queued offline',
        failed: 'Failed to enqueue offline PM update',
        context: { pmId },
      },
    );
  }

  private queuePMDelete(pmId: string): OfflineAwareResult<null> {
    return this.enqueueOffline(
      { type: 'pm_delete', payload: { pmId } },
      {
        queued: 'PM delete queued offline',
        failed: 'Failed to enqueue offline PM delete',
        context: { pmId },
      },
    );
  }
}
