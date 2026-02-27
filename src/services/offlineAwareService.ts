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
import { createWorkOrderNoteWithImages } from '@/features/work-orders/services/workOrderNotesService';
import { logger } from '@/utils/logger';
import { isNetworkError } from '@/utils/errorHandling';
import type { CreateWorkOrderData } from '@/features/work-orders/hooks/useWorkOrderCreation';
import type { UpdateWorkOrderData } from '@/features/work-orders/hooks/useWorkOrderUpdate';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import type {
  QuickEquipmentCreateData,
  EquipmentCreateData,
  EquipmentUpdateData,
} from '@/features/equipment/services/EquipmentService';
import type { UpdateWorkingHoursData } from '@/features/equipment/services/equipmentWorkingHoursService';
import { OfflineQueueService, OfflineQueuePayloadError } from './offlineQueueService';
import type { WorkOrderServerSnapshot } from './offlineQueueService';

// ─── Result type ─────────────────────────────────────────────────────────────

export interface OfflineAwareResult<T> {
  data: T | null;
  queuedOffline: boolean;
  queueItemId?: string;
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
  ): Promise<OfflineAwareResult<{ id: string; [key: string]: unknown }>> {
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
        estimated_hours: undefined,
        assignee_id: assigneeId,
        team_id: undefined,
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
      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.dueDate !== undefined) updateData.due_date = data.dueDate || null;
      if (data.estimatedHours !== undefined) updateData.estimated_hours = data.estimatedHours || null;
      if (data.hasPM !== undefined) updateData.has_pm = data.hasPM;
      updateData.updated_at = new Date().toISOString();

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

  async updateStatus(
    workOrderId: string,
    newStatus: WorkOrderStatus,
    serverUpdatedAt?: string,
  ): Promise<OfflineAwareResult<Record<string, unknown>>> {
    // ── TIER 1: Fast pre-check ──
    if (!navigator.onLine) {
      return this.queueStatus(workOrderId, newStatus, serverUpdatedAt);
    }

    // ── TIER 2: Attempt real call ──
    try {
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

      const { data, error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', workOrderId)
        .select()
        .single();

      if (error) throw error;
      return { data, queuedOffline: false };
    } catch (error) {
      if (isNetworkError(error)) {
        return this.queueStatus(workOrderId, newStatus, serverUpdatedAt);
      }
      throw error;
    }
  }

  // ── Private queue helpers ──────────────────────────────────────────────

  private queueCreate(
    data: CreateWorkOrderData,
    resolvedAssigneeId?: string,
  ): OfflineAwareResult<{ id: string; [key: string]: unknown }> {
    try {
      const item = this.queueService.enqueue({
        type: 'work_order_create',
        payload: { ...data, assigneeId: resolvedAssigneeId ?? data.assigneeId },
        organizationId: this.orgId,
        userId: this.userId,
      });
      logger.info('Work order create queued offline', { queueItemId: item.id });
      return { data: null, queuedOffline: true, queueItemId: item.id };
    } catch (err) {
      if (err instanceof OfflineQueuePayloadError) {
        // Payload validation failed — can't save offline either
        throw err;
      }
      logger.error('Failed to enqueue offline create', err);
      throw new Error('Cannot save offline — please try again when connected.');
    }
  }

  private queueUpdate(
    workOrderId: string,
    data: UpdateWorkOrderData,
    serverUpdatedAt?: string,
    serverSnapshot?: WorkOrderServerSnapshot,
  ): OfflineAwareResult<Record<string, unknown>> {
    try {
      // Determine which fields changed for conflict resolution
      const changedFields = Object.keys(data).filter(
        k => (data as Record<string, unknown>)[k] !== undefined,
      );

      const item = this.queueService.enqueue({
        type: 'work_order_update',
        payload: {
          workOrderId,
          data,
          changedFields,
          serverUpdatedAt,
          serverSnapshot,
        },
        organizationId: this.orgId,
        userId: this.userId,
      });
      logger.info('Work order update queued offline', { queueItemId: item.id, workOrderId });
      return { data: null, queuedOffline: true, queueItemId: item.id };
    } catch (err) {
      if (err instanceof OfflineQueuePayloadError) throw err;
      logger.error('Failed to enqueue offline update', err);
      throw new Error('Cannot save offline — please try again when connected.');
    }
  }

  private queueStatus(
    workOrderId: string,
    newStatus: WorkOrderStatus,
    serverUpdatedAt?: string,
  ): OfflineAwareResult<Record<string, unknown>> {
    try {
      const item = this.queueService.enqueue({
        type: 'work_order_status',
        payload: {
          workOrderId,
          newStatus,
          serverUpdatedAt,
        },
        organizationId: this.orgId,
        userId: this.userId,
      });
      logger.info('Work order status queued offline', { queueItemId: item.id, workOrderId, newStatus });
      return { data: null, queuedOffline: true, queueItemId: item.id };
    } catch (err) {
      if (err instanceof OfflineQueuePayloadError) throw err;
      logger.error('Failed to enqueue offline status update', err);
      throw new Error('Cannot save offline — please try again when connected.');
    }
  }

  // ── Equipment Create (Quick) ─────────────────────────────────────────────

  async createEquipmentQuick(
    data: QuickEquipmentCreateData,
  ): Promise<OfflineAwareResult<{ id: string; [key: string]: unknown }>> {
    if (!navigator.onLine) return this.queueEquipmentCreateQuick(data);
    try {
      const result = await EquipmentService.createQuick(this.orgId, data);
      if (!result.success || !result.data) throw new Error(result.error || 'Failed to create equipment');
      return { data: result.data, queuedOffline: false };
    } catch (error) {
      if (isNetworkError(error)) return this.queueEquipmentCreateQuick(data);
      throw error;
    }
  }

  // ── Equipment Create (Full) ──────────────────────────────────────────────

  async createEquipmentFull(
    data: EquipmentCreateData,
  ): Promise<OfflineAwareResult<{ id: string; [key: string]: unknown }>> {
    if (!navigator.onLine) return this.queueEquipmentCreateFull(data);
    try {
      const result = await EquipmentService.create(this.orgId, data);
      if (!result.success || !result.data) throw new Error(result.error || 'Failed to create equipment');
      return { data: result.data, queuedOffline: false };
    } catch (error) {
      if (isNetworkError(error)) return this.queueEquipmentCreateFull(data);
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
  ): Promise<OfflineAwareResult<{ id: string; [key: string]: unknown }>> {
    if (!navigator.onLine) return this.queueEquipmentNote(equipmentId, content, hoursWorked, isPrivate);
    try {
      const note = await createEquipmentNoteWithImages(
        equipmentId,
        content,
        hoursWorked,
        isPrivate,
        [],
        this.orgId,
      );
      return { data: note, queuedOffline: false };
    } catch (error) {
      if (isNetworkError(error)) return this.queueEquipmentNote(equipmentId, content, hoursWorked, isPrivate);
      throw error;
    }
  }

  // ── Work Order Note (text only) ──────────────────────────────────────────

  async createWorkOrderNote(
    workOrderId: string,
    content: string,
    hoursWorked: number = 0,
    isPrivate: boolean = false,
  ): Promise<OfflineAwareResult<{ id: string; [key: string]: unknown }>> {
    if (!navigator.onLine) return this.queueWorkOrderNote(workOrderId, content, hoursWorked, isPrivate);
    try {
      const note = await createWorkOrderNoteWithImages(
        workOrderId,
        content,
        hoursWorked,
        isPrivate,
        [],
        this.orgId,
      );
      return { data: note, queuedOffline: false };
    } catch (error) {
      if (isNetworkError(error)) return this.queueWorkOrderNote(workOrderId, content, hoursWorked, isPrivate);
      throw error;
    }
  }

  // ── Private queue helpers (equipment & notes) ─────────────────────────────

  private queueEquipmentCreateQuick(
    data: QuickEquipmentCreateData,
  ): OfflineAwareResult<{ id: string; [key: string]: unknown }> {
    try {
      const item = this.queueService.enqueue({
        type: 'equipment_create',
        payload: data,
        organizationId: this.orgId,
        userId: this.userId,
      });
      logger.info('Equipment create (quick) queued offline', { queueItemId: item.id });
      return { data: null, queuedOffline: true, queueItemId: item.id };
    } catch (err) {
      if (err instanceof OfflineQueuePayloadError) throw err;
      logger.error('Failed to enqueue offline equipment create', err);
      throw new Error('Cannot save offline — please try again when connected.');
    }
  }

  private queueEquipmentCreateFull(
    data: EquipmentCreateData,
  ): OfflineAwareResult<{ id: string; [key: string]: unknown }> {
    try {
      const item = this.queueService.enqueue({
        type: 'equipment_create_full',
        payload: data,
        organizationId: this.orgId,
        userId: this.userId,
      });
      logger.info('Equipment create (full) queued offline', { queueItemId: item.id });
      return { data: null, queuedOffline: true, queueItemId: item.id };
    } catch (err) {
      if (err instanceof OfflineQueuePayloadError) throw err;
      logger.error('Failed to enqueue offline equipment create', err);
      throw new Error('Cannot save offline — please try again when connected.');
    }
  }

  private queueEquipmentUpdate(
    equipmentId: string,
    data: EquipmentUpdateData,
    serverUpdatedAt?: string,
  ): OfflineAwareResult<Record<string, unknown>> {
    try {
      const changedFields = Object.keys(data).filter(
        k => (data as Record<string, unknown>)[k] !== undefined,
      );
      const item = this.queueService.enqueue({
        type: 'equipment_update',
        payload: {
          equipmentId,
          data,
          changedFields,
          serverUpdatedAt: serverUpdatedAt || new Date().toISOString(),
        },
        organizationId: this.orgId,
        userId: this.userId,
      });
      logger.info('Equipment update queued offline', { queueItemId: item.id, equipmentId });
      return { data: null, queuedOffline: true, queueItemId: item.id };
    } catch (err) {
      if (err instanceof OfflineQueuePayloadError) throw err;
      logger.error('Failed to enqueue offline equipment update', err);
      throw new Error('Cannot save offline — please try again when connected.');
    }
  }

  private queueEquipmentHours(data: UpdateWorkingHoursData): OfflineAwareResult<unknown> {
    try {
      const item = this.queueService.enqueue({
        type: 'equipment_hours',
        payload: data,
        organizationId: this.orgId,
        userId: this.userId,
      });
      logger.info('Equipment hours queued offline', { queueItemId: item.id, equipmentId: data.equipmentId });
      return { data: null, queuedOffline: true, queueItemId: item.id };
    } catch (err) {
      if (err instanceof OfflineQueuePayloadError) throw err;
      logger.error('Failed to enqueue offline equipment hours', err);
      throw new Error('Cannot save offline — please try again when connected.');
    }
  }

  private queueEquipmentNote(
    equipmentId: string,
    content: string,
    hoursWorked: number,
    isPrivate: boolean,
  ): OfflineAwareResult<{ id: string; [key: string]: unknown }> {
    try {
      const item = this.queueService.enqueue({
        type: 'equipment_note',
        payload: { equipmentId, content, hoursWorked, isPrivate },
        organizationId: this.orgId,
        userId: this.userId,
      });
      logger.info('Equipment note queued offline', { queueItemId: item.id, equipmentId });
      return { data: null, queuedOffline: true, queueItemId: item.id };
    } catch (err) {
      if (err instanceof OfflineQueuePayloadError) throw err;
      logger.error('Failed to enqueue offline equipment note', err);
      throw new Error('Cannot save offline — please try again when connected.');
    }
  }

  private queueWorkOrderNote(
    workOrderId: string,
    content: string,
    hoursWorked: number,
    isPrivate: boolean,
  ): OfflineAwareResult<{ id: string; [key: string]: unknown }> {
    try {
      const item = this.queueService.enqueue({
        type: 'work_order_note',
        payload: { workOrderId, content, hoursWorked, isPrivate },
        organizationId: this.orgId,
        userId: this.userId,
      });
      logger.info('Work order note queued offline', { queueItemId: item.id, workOrderId });
      return { data: null, queuedOffline: true, queueItemId: item.id };
    } catch (err) {
      if (err instanceof OfflineQueuePayloadError) throw err;
      logger.error('Failed to enqueue offline work order note', err);
      throw new Error('Cannot save offline — please try again when connected.');
    }
  }
}
