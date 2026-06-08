import type { WorkOrder, WorkOrderData } from '@/features/work-orders/types/workOrder';
import type { AssignmentWorkOrderContext } from '@/features/work-orders/hooks/useWorkOrderContextualAssignment';

export const mapToWorkOrderData = (workOrder: WorkOrder): WorkOrderData => ({
  id: workOrder.id,
  title: workOrder.title,
  description: workOrder.description,
  equipmentId: workOrder.equipmentId ?? workOrder.equipment_id ?? '',
  organizationId: workOrder.organizationId ?? workOrder.organization_id ?? '',
  priority: workOrder.priority,
  status: workOrder.status,
  assigneeId: workOrder.assigneeId ?? workOrder.assignee_id,
  assigneeName: workOrder.assigneeName,
  teamId: workOrder.teamId ?? workOrder.team_id,
  teamName: workOrder.teamName ?? workOrder.equipmentTeamName,
  createdDate: workOrder.createdDate ?? workOrder.created_date ?? '',
  created_date: workOrder.created_date ?? workOrder.createdDate ?? '',
  dueDate: workOrder.dueDate ?? workOrder.due_date,
  estimatedHours: workOrder.estimatedHours ?? workOrder.estimated_hours,
  completedDate: workOrder.completedDate ?? workOrder.completed_date,
  equipmentName: workOrder.equipmentName,
  equipmentManufacturer: workOrder.equipmentManufacturer,
  equipmentModel: workOrder.equipmentModel,
  equipmentSerialNumber: workOrder.equipmentSerialNumber,
  equipmentWorkingHours: workOrder.equipmentWorkingHours,
  equipmentImageUrl: workOrder.equipmentImageUrl,
  createdByName: workOrder.createdByName,
});

export const getAssignmentContext = (workOrder: WorkOrder): AssignmentWorkOrderContext => ({
  ...workOrder,
  organization_id: workOrder.organization_id ?? workOrder.organizationId ?? '',
  equipment_id: workOrder.equipment_id ?? workOrder.equipmentId ?? '',
  equipmentTeamId: workOrder.equipmentTeamId ?? workOrder.team_id,
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
