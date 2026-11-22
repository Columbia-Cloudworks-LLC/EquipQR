import { supabase } from '@/integrations/supabase/client';
import type { UpdateWorkingHoursData } from '@/features/equipment/services/equipmentWorkingHoursService';
import { createPM, type PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { WorkOrderService } from '@/features/work-orders/services/workOrderService';
import { attachWorkOrderCreationImages } from '@/features/work-orders/services/workOrderNotesService';
import type { WorkOrder, WorkOrderPriority } from '@/features/work-orders/types/workOrder';
import { requireAuthUserIdFromClaims } from '@/lib/authClaims';
import { resolvePMTemplateId } from '@/features/pm-templates/utils/resolvePMTemplateId';
import type { QRActionEquipment } from '@/features/equipment/services/equipmentQRPermissions';
import { recordScanFollowUpEvent } from '@/features/equipment/services/scanFollowUpEventService';
import { logger } from '@/utils/logger';
import { OfflineAwareWorkOrderService } from '@/services/offlineAwareService';
import { OfflineQueueService } from '@/services/offlineQueueService';

export interface CreateQRWorkOrderInput {
  equipment: QRActionEquipment;
  title: string;
  description: string;
  priority: WorkOrderPriority;
  dueDate?: string;
  attachPM: boolean;
  /** When equipment has no default PM template, supply the chosen template id from the QR dialog. */
  pmTemplateId?: string;
  images?: File[];
  creationPhotoNote?: string;
  /** Scan that this action originated from; used for best-effort follow-up attribution. */
  scanId?: string | null;
}

export interface CreateQRWorkOrderResult {
  /** Null when the work order was saved on the device to sync later. */
  workOrder: WorkOrder | null;
  creationPhotosAttached: boolean;
  /** True when there was no connection and the work order is waiting to sync. */
  queuedOffline: boolean;
}

/** A request that never reached the server (not a refusal from it). */
const CONNECTION_LOST_PATTERN = /Failed to fetch|Load failed|NetworkError|ERR_INTERNET|ERR_NETWORK|net::/i;

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * The scan page must work the same with or without signal. With no
 * connection the action goes into the same offline queue the dashboard uses
 * (work order + PM checklist + photos are replayed together on sync).
 */
async function offlineServiceFor(organizationId: string): Promise<OfflineAwareWorkOrderService> {
  const userId = await requireAuthUserIdFromClaims();
  return new OfflineAwareWorkOrderService(organizationId, userId);
}

async function queueQRWorkOrder(input: CreateQRWorkOrderInput): Promise<CreateQRWorkOrderResult> {
  const pmTemplateId = input.attachPM
    ? resolvePMTemplateId({
        explicitTemplateId: input.pmTemplateId,
        equipmentDefaultTemplateId: input.equipment.defaultPmTemplateId,
      })
    : undefined;
  if (input.attachPM && !pmTemplateId) {
    throw new Error('Select a PM checklist template to create this work order.');
  }

  const offline = await offlineServiceFor(input.equipment.organizationId);
  await offline.createWorkOrder({
    title: input.title,
    description: input.description,
    equipmentId: input.equipment.id,
    priority: input.priority,
    dueDate: input.dueDate || undefined,
    hasPM: input.attachPM,
    pmTemplateId: pmTemplateId ?? undefined,
    images: input.images,
    creationPhotoNote: input.creationPhotoNote,
  });

  return { workOrder: null, creationPhotosAttached: true, queuedOffline: true };
}

/**
 * Keep a scan made with no connection so it is recorded when the device is
 * back online. Returns the id the scan will have on the server.
 */
export async function queueOfflineScan(scan: {
  organizationId: string;
  equipmentId: string;
  scannedAt: string;
  location?: string | null;
}): Promise<string> {
  const userId = await requireAuthUserIdFromClaims();
  const scanId = crypto.randomUUID();
  new OfflineQueueService(userId, scan.organizationId).enqueue({
    type: 'equipment_scan',
    payload: {
      scanId,
      equipmentId: scan.equipmentId,
      scannedAt: scan.scannedAt,
      location: scan.location ?? null,
    },
    organizationId: scan.organizationId,
    userId,
  });
  return scanId;
}

async function getPMTemplateData(templateId: string, organizationId: string): Promise<{
  checklistData: PMChecklistItem[];
  notes: string;
}> {
  const { data, error } = await supabase
    .from('pm_checklist_templates')
    .select('template_data, description')
    .eq('id', templateId)
    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('The assigned PM template could not be found.');

  return {
    checklistData: (data.template_data ?? []) as unknown as PMChecklistItem[],
    notes: data.description || '',
  };
}

export async function createQRWorkOrder(input: CreateQRWorkOrderInput): Promise<CreateQRWorkOrderResult> {
  if (isOffline()) return queueQRWorkOrder(input);

  const createdBy = await requireAuthUserIdFromClaims();
  const service = new WorkOrderService(input.equipment.organizationId);
  const result = await service.create({
    title: input.title,
    description: input.description,
    equipment_id: input.equipment.id,
    priority: input.priority,
    status: 'submitted',
    due_date: input.dueDate || undefined,
    created_by: createdBy,
    has_pm: input.attachPM,
  });

  if (!result.success || !result.data) {
    // The connection dropped before anything was created: save it on the
    // device instead of losing what the technician typed.
    if (isOffline() || CONNECTION_LOST_PATTERN.test(result.error ?? '')) return queueQRWorkOrder(input);
    throw new Error(result.error || 'Failed to create work order.');
  }

  if (input.attachPM) {
    let pmError: unknown;

    const resolvedTemplateId = resolvePMTemplateId({
      explicitTemplateId: input.pmTemplateId,
      equipmentDefaultTemplateId: input.equipment.defaultPmTemplateId,
    });

    if (!resolvedTemplateId) {
      pmError = new Error('Select a PM checklist template to create this work order.');
    } else {
      try {
        const template = await getPMTemplateData(
          resolvedTemplateId,
          input.equipment.organizationId
        );
        const pm = await createPM({
          workOrderId: result.data.id,
          equipmentId: input.equipment.id,
          organizationId: input.equipment.organizationId,
          checklistData: template.checklistData,
          notes: template.notes,
          templateId: resolvedTemplateId,
        });
        if (!pm) {
          pmError = new Error('PM initialization failed.');
        }
      } catch (error) {
        pmError = error;
      }
    }

    if (pmError !== undefined) {
      try {
        const deleteResult = await service.delete(result.data.id);
        if (!deleteResult.success) {
          logger.error('Failed to rollback work order after PM initialization failure', deleteResult.error);
        }
      } catch (deleteError) {
        logger.error('Exception during rollback of work order after PM initialization failure', deleteError);
      }
      throw pmError instanceof Error ? pmError : new Error('PM initialization failed.');
    }
  }

  let creationPhotosAttached = !input.images?.length;

  if (input.images?.length) {
    try {
      const { primaryImageId } = await attachWorkOrderCreationImages({
        workOrderId: result.data.id,
        organizationId: input.equipment.organizationId,
        images: input.images,
        noteContent: input.creationPhotoNote,
      });
      creationPhotosAttached = Boolean(primaryImageId);
    } catch (error) {
      logger.error('QR work order creation photos failed to attach', error);
      creationPhotosAttached = false;
    }
  }

  if (input.scanId) {
    try {
      await recordScanFollowUpEvent({
        organizationId: input.equipment.organizationId,
        scanId: input.scanId,
        equipmentId: input.equipment.id,
        eventType: input.attachPM ? 'pm_work_order_created' : 'generic_work_order_created',
        entityType: 'work_order',
        entityId: result.data.id,
        metadata: { title: result.data.title },
      });
    } catch (error) {
      logger.error('Failed to record work order scan follow-up event', error);
    }
  }

  return {
    workOrder: result.data,
    creationPhotosAttached,
    queuedOffline: false,
  };
}

export async function updateQRWorkingHours(
  data: UpdateWorkingHoursData & { organizationId: string; scanId?: string | null }
): Promise<{ queuedOffline: boolean }> {
  const { scanId, organizationId, ...workingHoursData } = data;
  const offline = await offlineServiceFor(organizationId);
  const result = await offline.updateWorkingHours({
    ...workingHoursData,
    updateSource: 'manual',
  });
  if (result.queuedOffline) return { queuedOffline: true };

  if (scanId) {
    try {
      await recordScanFollowUpEvent({
        organizationId,
        scanId,
        equipmentId: workingHoursData.equipmentId,
        eventType: 'working_hours_updated',
        metadata: { newHours: workingHoursData.newHours },
      });
    } catch (error) {
      logger.error('Failed to record working hours scan follow-up event', error);
    }
  }

  return { queuedOffline: false };
}

export async function createQREquipmentNote(input: {
  equipmentId: string;
  organizationId: string;
  content: string;
  images: File[];
  isPrivate: boolean;
  machineHours?: number | null;
  scanId?: string | null;
}): Promise<{ queuedOffline: boolean }> {
  const offline = await offlineServiceFor(input.organizationId);
  const result = await offline.createEquipmentNote(
    input.equipmentId,
    input.content,
    0,
    input.isPrivate,
    input.machineHours ?? undefined,
    input.images,
  );
  if (result.queuedOffline) return { queuedOffline: true };

  if (input.scanId) {
    try {
      await recordScanFollowUpEvent({
        organizationId: input.organizationId,
        scanId: input.scanId,
        equipmentId: input.equipmentId,
        eventType: 'note_image_added',
        entityType: 'note',
        metadata: { imageCount: input.images.length, isPrivate: input.isPrivate },
      });
    } catch (error) {
      logger.error('Failed to record note scan follow-up event', error);
    }
  }

  return { queuedOffline: false };
}
