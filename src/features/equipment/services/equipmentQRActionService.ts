import { supabase } from '@/integrations/supabase/client';
import { createEquipmentNoteWithImages } from '@/features/equipment/services/equipmentNotesService';
import {
  updateEquipmentWorkingHours,
  type UpdateWorkingHoursData,
} from '@/features/equipment/services/equipmentWorkingHoursService';
import { createPM, type PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { WorkOrderService } from '@/features/work-orders/services/workOrderService';
import { attachWorkOrderCreationImages } from '@/features/work-orders/services/workOrderNotesService';
import type { WorkOrder, WorkOrderPriority } from '@/features/work-orders/types/workOrder';
import { requireAuthUserIdFromClaims } from '@/lib/authClaims';
import type { QRActionEquipment } from '@/features/equipment/services/equipmentQRPermissions';
import { logger } from '@/utils/logger';

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
}

export interface CreateQRWorkOrderResult {
  workOrder: WorkOrder;
  creationPhotosAttached: boolean;
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
  const createdBy = await requireAuthUserIdFromClaims();
  const service = new WorkOrderService(input.equipment.organizationId);
  const result = await service.create({
    title: input.title,
    description: input.description,
    equipment_id: input.equipment.id,
    priority: input.priority,
    status: 'submitted',
    team_id: input.equipment.teamId ?? undefined,
    due_date: input.dueDate || undefined,
    created_by: createdBy,
    has_pm: input.attachPM,
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to create work order.');
  }

  if (input.attachPM) {
    let pmError: unknown;

    const resolvedTemplateId = input.pmTemplateId ?? input.equipment.defaultPmTemplateId;

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

  return {
    workOrder: result.data,
    creationPhotosAttached,
  };
}

export async function updateQRWorkingHours(data: UpdateWorkingHoursData): Promise<unknown> {
  return updateEquipmentWorkingHours({
    ...data,
    updateSource: 'manual',
  });
}

export async function createQREquipmentNote(input: {
  equipmentId: string;
  organizationId: string;
  content: string;
  images: File[];
  isPrivate: boolean;
  machineHours?: number | null;
}): Promise<unknown> {
  return createEquipmentNoteWithImages(
    input.equipmentId,
    input.content,
    0,
    input.isPrivate,
    input.images,
    input.organizationId,
    input.machineHours ?? undefined
  );
}
