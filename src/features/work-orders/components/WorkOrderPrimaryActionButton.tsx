import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Play, 
  AlertTriangle
} from 'lucide-react';
import { useSimpleOrganizationSafe } from '@/hooks/useSimpleOrganization';
import { WorkOrderLike } from '@/features/work-orders/utils/workOrderTypeConversion';
import { useWorkOrderStatusChangeHandlers } from '@/features/work-orders/hooks/useWorkOrderStatusChangeHandlers';
import WorkOrderAcceptanceModal from './WorkOrderAcceptanceModal';

interface WorkOrderPrimaryActionButtonProps {
  workOrder: {
    id: string;
    status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
    has_pm?: boolean;
    assignee_id?: string;
    created_by?: string;
  };
  organizationId?: string; // Optional for backward compatibility, but will use context if not provided
}

export const WorkOrderPrimaryActionButton: React.FC<WorkOrderPrimaryActionButtonProps> = ({
  workOrder,
  organizationId: propOrganizationId
}) => {
  const context = useSimpleOrganizationSafe();
  const contextOrganizationId = context?.organizationId ?? null;
  const organizationId = propOrganizationId || contextOrganizationId || '';
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);

  const {
    updateStatusMutation,
    acceptanceMutation,
    isManager,
    isTechnician,
    canPerformStatusActions,
    canCompleteWorkOrder,
    handleStatusChange,
    handleAcceptanceComplete,
  } = useWorkOrderStatusChangeHandlers(
    workOrder,
    organizationId,
    () => setShowAcceptanceModal(true),
  );
  
  if (!organizationId) {
    return null;
  }

  const getPrimaryAction = () => {
    if (!canPerformStatusActions()) return null;

    const canComplete = canCompleteWorkOrder();
    
    switch (workOrder.status) {
      case 'submitted':
        if (isManager || isTechnician) {
          return { 
            label: 'Accept', 
            action: () => handleStatusChange('accepted'), 
            icon: CheckCircle,
            variant: 'secondary' as const
          };
        }
        return null;

      case 'accepted':
        if (isManager || isTechnician) {
          return { 
            label: 'Start Work', 
            action: () => handleStatusChange('in_progress'), 
            icon: Play,
            variant: 'secondary' as const
          };
        }
        return null;

      case 'assigned':
        if (isManager || isTechnician) {
          return { 
            label: 'Start Work', 
            action: () => handleStatusChange('in_progress'), 
            icon: Play,
            variant: 'secondary' as const
          };
        }
        return null;

      case 'in_progress':
        if (isManager || isTechnician) {
          return { 
            label: 'Complete', 
            action: () => handleStatusChange('completed'), 
            icon: CheckCircle,
            variant: 'default' as const,
            disabled: !canComplete,
            tooltip: !canComplete ? 'Complete PM checklist first' : undefined
          };
        }
        return null;

      case 'on_hold':
        if (isManager || isTechnician) {
          return { 
            label: 'Resume', 
            action: () => handleStatusChange('in_progress'), 
            icon: Play,
            variant: 'secondary' as const
          };
        }
        return null;

      default:
        return null;
    }
  };

  const primaryAction = getPrimaryAction();

  if (!primaryAction) {
    return null;
  }

  const IconComponent = primaryAction.icon;

  return (
    <>
      <div className="relative">
        <Button
          variant={primaryAction.variant}
          size="sm"
          onClick={primaryAction.action}
          disabled={updateStatusMutation.isPending || acceptanceMutation.isPending || primaryAction.disabled}
          className="font-medium"
          title={primaryAction.tooltip}
        >
          <IconComponent className="h-4 w-4 mr-2" />
          {primaryAction.label}
        </Button>
        
        {primaryAction.disabled && workOrder.has_pm && workOrder.status === 'in_progress' && (
          <div className="absolute -top-1 -right-1">
            <AlertTriangle className="h-3 w-3 text-warning" />
          </div>
        )}
      </div>

      <WorkOrderAcceptanceModal
        open={showAcceptanceModal}
        onClose={() => setShowAcceptanceModal(false)}
        workOrder={workOrder as WorkOrderLike}
        organizationId={organizationId}
        onAccept={async (assigneeId) => {
          await handleAcceptanceComplete(assigneeId);
          setShowAcceptanceModal(false);
        }}
      />
    </>
  );
};
