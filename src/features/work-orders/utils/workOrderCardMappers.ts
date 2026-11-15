import { resolveWorkOrderAssignment } from '@/features/work-orders/utils/resolveWorkOrderAssignment';
import type { WorkOrder, WorkOrderData } from '@/features/work-orders/types/workOrder';
import type { AssignmentWorkOrderContext } from '@/features/work-orders/hooks/useWorkOrderContextualAssignment';

export const mapToWorkOrderData = (workOrder: WorkOrder): WorkOrderData => ({
  id: workOrder.id,
  title: workOrder.title,
  description: workOrder.description,
  equipmentId: workOrder.equipment_id,
  organizationId: workOrder.organization_id,
  priority: workOrder.priority,
  status: workOrder.status,
  assigneeId: resolveWorkOrderAssignment(workOrder).id ?? undefined,
  assigneeName: resolveWorkOrderAssignment(workOrder).name,
  teamId: workOrder.teamId ?? workOrder.equipmentTeamId,
  teamName: workOrder.teamName ?? workOrder.equipmentTeamName,
  createdDate: workOrder.created_date,
  created_date: workOrder.created_date,
  dueDate: workOrder.due_date ?? undefined,
  estimatedHours: workOrder.estimated_hours ?? undefined,
  completedDate: workOrder.completed_date ?? undefined,
  equipmentName: workOrder.equipmentName,
  equipmentManufacturer: workOrder.equipmentManufacturer,
  equipmentModel: workOrder.equipmentModel,
  equipmentSerialNumber: workOrder.equipmentSerialNumber,
  equipmentWorkingHours: workOrder.equipmentWorkingHours,
  equipmentImageUrl: workOrder.equipmentImageUrl,
  createdByName: workOrder.createdByName,
  createdBy: workOrder.created_by,
});

export const getAssignmentContext = (workOrder: WorkOrder): AssignmentWorkOrderContext => ({
  ...workOrder,
  organization_id: workOrder.organization_id,
  equipment_id: workOrder.equipment_id,
  equipmentTeamId: workOrder.equipmentTeamId,
});

export function getAssigneeInitials(assigneeName?: string | null): string {
  if (!assigneeName) return '?';
  const chars = assigneeName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase();
  return chars.slice(0, 2) || '?';
}
