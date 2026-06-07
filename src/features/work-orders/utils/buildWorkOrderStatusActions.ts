import { CheckCircle, Pause, Play, X } from 'lucide-react';
import type { ComponentType } from 'react';

export type WorkOrderStatusAction = {
  label: string;
  action: () => void;
  icon: ComponentType<{ className?: string }>;
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
  description: string;
  disabled?: boolean;
};

type BuildWorkOrderStatusActionsParams = {
  status: string;
  canPerformStatusActions: boolean;
  isManager: boolean;
  isTechnician: boolean;
  canComplete: boolean;
  onStatusChange: (status: string) => void;
};

export function buildWorkOrderStatusActions({
  status,
  canPerformStatusActions,
  isManager,
  isTechnician,
  canComplete,
  onStatusChange,
}: BuildWorkOrderStatusActionsParams): WorkOrderStatusAction[] {
  if (!canPerformStatusActions) return [];

  switch (status) {
    case 'submitted': {
      const actions: WorkOrderStatusAction[] = [];
      if (isManager || isTechnician) {
        actions.push({
          label: 'Accept',
          action: () => onStatusChange('accepted'),
          icon: CheckCircle,
          variant: 'secondary',
          description: 'Accept this work order and proceed with planning',
        });
      }
      actions.push({
        label: 'Cancel',
        action: () => onStatusChange('cancelled'),
        icon: X,
        variant: 'outline',
        description: 'Cancel this work order',
      });
      return actions;
    }

    case 'accepted':
      if (!isManager && !isTechnician) return [];
      return [
        {
          label: 'Cancel',
          action: () => onStatusChange('cancelled'),
          icon: X,
          variant: 'outline',
          description: 'Cancel this work order',
        },
      ];

    case 'assigned':
      if (!isManager && !isTechnician) return [];
      return [
        {
          label: 'Start Work',
          action: () => onStatusChange('in_progress'),
          icon: Play,
          variant: 'secondary',
          description: 'Begin working on this order',
        },
        {
          label: 'Put on Hold',
          action: () => onStatusChange('on_hold'),
          icon: Pause,
          variant: 'outline',
          description: 'Temporarily pause this work order',
        },
      ];

    case 'in_progress':
      if (!isManager && !isTechnician) return [];
      return [
        {
          label: 'Complete',
          action: () => onStatusChange('completed'),
          icon: CheckCircle,
          variant: 'default',
          description: canComplete
            ? 'Mark this work order as completed'
            : 'Complete PM checklist first',
          disabled: !canComplete,
        },
        {
          label: 'Put on Hold',
          action: () => onStatusChange('on_hold'),
          icon: Pause,
          variant: 'outline',
          description: 'Temporarily pause this work order',
        },
      ];

    case 'on_hold':
      if (!isManager && !isTechnician) return [];
      return [
        {
          label: 'Resume',
          action: () => onStatusChange('in_progress'),
          icon: Play,
          variant: 'secondary',
          description: 'Resume work on this order',
        },
        {
          label: 'Cancel',
          action: () => onStatusChange('cancelled'),
          icon: X,
          variant: 'outline',
          description: 'Cancel this work order',
        },
      ];

    default:
      return [];
  }
}
