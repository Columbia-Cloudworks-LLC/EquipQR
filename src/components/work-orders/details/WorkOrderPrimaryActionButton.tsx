import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Play, 
  Pause, 
  X, 
  AlertTriangle,
  Clipboard
} from 'lucide-react';
import { useUpdateWorkOrderStatus } from '@/hooks/useWorkOrderData';
import { usePMByWorkOrderId } from '@/hooks/usePMData';
import { useWorkOrderPermissionLevels } from '@/hooks/useWorkOrderPermissionLevels';
import { useAuth } from '@/hooks/useAuth';
import { UnifiedWorkOrder } from '@/types/unifiedWorkOrder';
import WorkOrderAcceptanceModal from '../WorkOrderAcceptanceModal';

interface WorkOrderPrimaryActionButtonProps {
  workOrder: UnifiedWorkOrder;
  organizationId: string;
}

export const WorkOrderPrimaryActionButton: React.FC<WorkOrderPrimaryActionButtonProps> = ({
  workOrder,
  organizationId
}) => {
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);
  const updateStatusMutation = useUpdateWorkOrderStatus();
  const { data: pmData } = usePMByWorkOrderId(workOrder.id);
  const { canEdit, isManager, isTechnician } = useWorkOrderPermissionLevels();
  const { user } = useAuth();

  const handleStatusChange = async (newStatus: string) => {
    // Check if trying to complete work order with incomplete PM
    if (newStatus === 'completed' && workOrder.has_pm && pmData) {
      if (pmData.status !== 'completed') {
        return;
      }
    }

    if (newStatus === 'accepted') {
      setShowAcceptanceModal(true);
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        workOrderId: workOrder.id,
        status: newStatus as any,
        organizationId
      });
    } catch (error) {
      console.error('Error updating work order status:', error);
    }
  };

  const handleAcceptanceComplete = async (assigneeId?: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        workOrderId: workOrder.id,
        status: 'accepted',
        organizationId
      });
      setShowAcceptanceModal(false);
    } catch (error) {
      console.error('Error accepting work order:', error);
    }
  };

  // Check if user can perform status actions
  const canPerformStatusActions = () => {
    if (isManager) return true;
    if (isTechnician && (workOrder.assignee_id === user?.id)) return true;
    if (workOrder.created_by === user?.id && workOrder.status === 'submitted') return true;
    return false;
  };

  const getPrimaryAction = () => {
    if (!canPerformStatusActions()) return null;

    const canComplete = !workOrder.has_pm || (pmData && pmData.status === 'completed');
    
    switch (workOrder.status) {
      case 'submitted':
        if (isManager || isTechnician) {
          return { 
            label: 'Accept', 
            action: () => handleStatusChange('accepted'), 
            icon: CheckCircle,
            variant: 'default' as const
          };
        }
        return null;

      case 'accepted':
        if (isManager || isTechnician) {
          return { 
            label: 'Start Work', 
            action: () => handleStatusChange('in_progress'), 
            icon: Play,
            variant: 'default' as const
          };
        }
        return null;

      case 'assigned':
        if (isManager || isTechnician) {
          return { 
            label: 'Start Work', 
            action: () => handleStatusChange('in_progress'), 
            icon: Play,
            variant: 'default' as const
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
            variant: 'default' as const
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
          disabled={updateStatusMutation.isPending || primaryAction.disabled}
          className="font-medium"
          title={primaryAction.tooltip}
        >
          <IconComponent className="h-4 w-4 mr-2" />
          {primaryAction.label}
        </Button>
        
        {/* PM Warning Indicator */}
        {primaryAction.disabled && workOrder.has_pm && workOrder.status === 'in_progress' && (
          <div className="absolute -top-1 -right-1">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
          </div>
        )}
      </div>

      <WorkOrderAcceptanceModal
        open={showAcceptanceModal}
        onClose={() => setShowAcceptanceModal(false)}
        workOrder={workOrder}
        organizationId={organizationId}
        onAccept={handleAcceptanceComplete}
      />
    </>
  );
};