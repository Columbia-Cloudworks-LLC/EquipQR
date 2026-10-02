import { resolveWorkOrderAssignment } from '@/features/work-orders/utils/resolveWorkOrderAssignment';
import { User, UserMinus, type LucideIcon } from 'lucide-react';

export type WorkOrderAssignmentDisplay = {
  type: 'user' | 'unassigned';
  name: string;
  icon: LucideIcon;
  label: string;
};

type WorkOrderAssigneeSource = {
  assignee_id?: string | null;
  assigneeName?: string | null;
  assignee?: { name?: string | null } | null;
};

export function getWorkOrderAssignmentDisplay(
  workOrder: WorkOrderAssigneeSource,
): WorkOrderAssignmentDisplay {
  const assignment = resolveWorkOrderAssignment(workOrder);

  if (assignment.id) {
    return {
      type: 'user',
      name: assignment.name,
      icon: User,
      label: 'Assigned to',
    };
  }

  return {
    type: 'unassigned',
    name: 'Unassigned',
    icon: UserMinus,
    label: 'Assignment',
  };
}
