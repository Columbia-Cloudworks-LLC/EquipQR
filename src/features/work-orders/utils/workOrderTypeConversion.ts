/**
 * Shared work-order shape for permission and status UI that accept snake_case or camelCase fields.
 */

export interface WorkOrderLike {
  id: string;
  status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  has_pm?: boolean;
  title?: string;
  description?: string;
  equipment_id?: string;
  equipmentId?: string;
  organization_id?: string;
  organizationId?: string;
  created_date?: string;
  createdDate?: string;
  assignee_id?: string;
  assigneeId?: string;
  team_id?: string;
  teamId?: string;
  created_by?: string;
  createdByName?: string;
}
