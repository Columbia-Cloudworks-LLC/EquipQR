export const formatStatusLabel = (status: string) =>
  status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export const getStatusChangeTitle = (oldStatus: string | null, newStatus: string) => {
  if (!oldStatus) {
    return 'Work Order Created';
  }
  if (oldStatus === 'completed' && newStatus === 'accepted') return 'Work Order Reverted';
  if (oldStatus === 'cancelled' && newStatus === 'accepted') return 'Work Order Reverted';

  switch (newStatus) {
    case 'accepted':
      return 'Work Order Accepted';
    case 'assigned':
      return 'Work Assigned';
    case 'in_progress':
      return 'Work Started';
    case 'completed':
      return 'Work Completed';
    case 'on_hold':
      return 'Work On Hold';
    case 'cancelled':
      return 'Work Order Cancelled';
    default:
      return 'Status Updated';
  }
};

export const getStatusChangeDescription = (
  oldStatus: string | null,
  newStatus: string,
  reason?: string,
) => {
  if (!oldStatus) {
    return 'Work order was submitted';
  }

  let baseDescription = `Status changed from ${formatStatusLabel(oldStatus)} to ${formatStatusLabel(newStatus)}`;
  if (reason && reason !== 'Status updated') {
    baseDescription += ` — ${reason}`;
  }
  return baseDescription;
};

export type WorkOrderCreationContext = {
  status: string;
  createdByName?: string;
  assigneeName?: string;
};

export const buildCreationDescription = ({
  status,
  createdByName,
  assigneeName,
}: WorkOrderCreationContext): string => {
  const parts: string[] = [];

  if (createdByName) {
    parts.push(`Submitted by ${createdByName}`);
  } else {
    parts.push('Work order was submitted');
  }

  if (assigneeName && status === 'assigned') {
    parts.push(`Assigned to ${assigneeName}`);
  }

  return parts.join(' • ');
};

export const getCreationTitle = (status: string, hasAssignee: boolean) => {
  if (status === 'assigned' && hasAssignee) {
    return 'Work Order Created & Assigned';
  }
  return getStatusChangeTitle(null, status);
};
