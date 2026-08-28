import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';

function describeLockedWorkOrderStatus(
  status: WorkOrderStatus,
): 'completed' | 'cancelled' | undefined {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'submitted':
    case 'accepted':
    case 'assigned':
    case 'in_progress':
    case 'on_hold':
      return undefined;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function getWorkOrderNotesLockMessage(status: WorkOrderStatus): string | undefined {
  const lockedStatus = describeLockedWorkOrderStatus(status);

  if (!lockedStatus) {
    return undefined;
  }

  return `This work order is ${lockedStatus}. Reopen it to add a note or attachment.`;
}

export function getWorkOrderDescriptionLockMessage(
  status: WorkOrderStatus,
): string | undefined {
  const lockedStatus = describeLockedWorkOrderStatus(status);

  if (!lockedStatus) {
    return undefined;
  }

  return `This work order is ${lockedStatus}. Reopen it to edit the description.`;
}

export const COMPLETED_PM_GENERAL_NOTES_LOCK_MESSAGE =
  'This PM checklist is completed. General notes are read-only after completion.';
