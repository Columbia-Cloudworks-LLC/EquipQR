import { supabase } from '@/integrations/supabase/client';
import { createEquipmentNoteWithImages } from '@/features/equipment/services/equipmentNotesService';
import {
  updateEquipmentWorkingHours,
  type UpdateWorkingHoursData,
} from '@/features/equipment/services/equipmentWorkingHoursService';
import { createPM, type PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { WorkOrderService } from '@/features/work-orders/services/workOrderService';
import type { WorkOrder, WorkOrderPriority } from '@/features/work-orders/types/workOrder';

export type QRActionType = 'pm-work-order' | 'generic-work-order' | 'update-hours' | 'note-image';
export type QRUserRole = 'owner' | 'admin' | 'member' | string;
export type QRTeamRole = 'manager' | 'technician' | 'requestor' | 'viewer' | string;

export interface QRActionTeamMembership {
  teamId: string;
  role: QRTeamRole;
}

export interface QRActionPermissionContext {
  userId: string;
  organizationId: string;
  userRole: QRUserRole;
  teamMemberships: QRActionTeamMembership[];
}

export interface QRActionEquipment {
  id: string;
  name: string;
  organizationId: string;
  teamId: string | null;
  workingHours: number | null;
  defaultPmTemplateId: string | null;
}

export interface CreateQRWorkOrderInput {
  equipment: QRActionEquipment;
  userId: string;
  title: string;
  description: string;
  priority: WorkOrderPriority;
  dueDate?: string;
  attachPM: boolean;
}

function isOrgAdmin(userRole: QRUserRole): boolean {
  return userRole === 'owner' || userRole === 'admin';
}

function isActiveOrgMember(userRole: QRUserRole): boolean {
  return isOrgAdmin(userRole) || userRole === 'member';
}

function getMembershipForTeam(
  teamMemberships: QRActionTeamMembership[],
  teamId: string | null | undefined
): QRActionTeamMembership | null {
  if (!teamId) return null;
  return teamMemberships.find(membership => membership.teamId === teamId) ?? null;
}

export function canRunQRAction(
  action: QRActionType,
  context: QRActionPermissionContext,
  equipmentTeamId: string | null | undefined
): boolean {
  if (!isActiveOrgMember(context.userRole)) return false;
  if (isOrgAdmin(context.userRole)) return true;

  const teamMembership = getMembershipForTeam(context.teamMemberships, equipmentTeamId);

  if (action === 'update-hours') {
    return teamMembership?.role === 'manager';
  }

  if (!equipmentTeamId) return true;
  return !!teamMembership;
}

export async function fetchQRActionTeamMemberships(
  userId: string,
  organizationId: string,
  userRole: QRUserRole,
  equipmentTeamId: string | null | undefined
): Promise<QRActionTeamMembership[]> {
  if (!equipmentTeamId || isOrgAdmin(userRole)) {
    return [];
  }

  const { data, error } = await supabase.rpc('get_user_team_memberships', {
    user_uuid: userId,
    org_id: organizationId,
  });

  if (error) throw new Error(error.message);

  return (data ?? []).map(membership => ({
    teamId: membership.team_id,
    role: membership.role,
  }));
}

async function getPMTemplateData(templateId: string): Promise<{
  checklistData: PMChecklistItem[];
  notes: string;
}> {
  const { data, error } = await supabase
    .from('pm_checklist_templates')
    .select('template_data, description')
    .eq('id', templateId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('The assigned PM template could not be found.');

  return {
    checklistData: (data.template_data ?? []) as unknown as PMChecklistItem[],
    notes: data.description || '',
  };
}

export async function createQRWorkOrder(input: CreateQRWorkOrderInput): Promise<WorkOrder> {
  const service = new WorkOrderService(input.equipment.organizationId);
  const result = await service.create({
    title: input.title,
    description: input.description,
    equipment_id: input.equipment.id,
    priority: input.priority,
    status: 'submitted',
    team_id: input.equipment.teamId ?? undefined,
    due_date: input.dueDate || undefined,
    created_by: input.userId,
    has_pm: input.attachPM,
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to create work order.');
  }

  if (input.attachPM) {
    if (!input.equipment.defaultPmTemplateId) {
      throw new Error('This equipment does not have a default PM template assigned.');
    }

    const template = await getPMTemplateData(input.equipment.defaultPmTemplateId);
    const pm = await createPM({
      workOrderId: result.data.id,
      equipmentId: input.equipment.id,
      organizationId: input.equipment.organizationId,
      checklistData: template.checklistData,
      notes: template.notes,
      templateId: input.equipment.defaultPmTemplateId,
    });

    if (!pm) {
      throw new Error('Work order created, but PM initialization failed.');
    }
  }

  return result.data;
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
