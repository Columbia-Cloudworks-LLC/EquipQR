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
  const assigneeName = workOrder.assigneeName || workOrder.assignee?.name;

  if (workOrder.assignee_id && assigneeName) {
    return {
      type: 'user',
      name: assigneeName,
      icon: User,
      label: 'Assigned to',
    };
  }

  return {
    type: 'unassigned',
    name: 'Not yet assigned',
    icon: UserMinus,
    label: 'Assignment',
  };
}
