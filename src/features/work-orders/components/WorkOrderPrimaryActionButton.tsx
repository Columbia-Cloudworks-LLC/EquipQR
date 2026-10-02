import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { buildWorkOrderStatusActions } from '@/features/work-orders/utils/buildWorkOrderStatusActions';
import { useId } from 'react';
import { useSimpleOrganizationSafe } from '@/hooks/useSimpleOrganization';
import { WorkOrderLike } from '@/features/work-orders/utils/workOrderTypeConversion';
import { useWorkOrderStatusChangeHandlers } from '@/features/work-orders/hooks/useWorkOrderStatusChangeHandlers';
import WorkOrderAcceptanceModal from './WorkOrderAcceptanceModal';

interface WorkOrderPrimaryActionButtonProps {
  workOrder: {
    id: string;
    status: 'submitted' | 'accepted' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
    has_pm?: boolean;
    assignee_id?: string | null;
    created_by?: string;
  };
  organizationId?: string; // Optional for backward compatibility, but will use context if not provided
}

export const WorkOrderPrimaryActionButton: React.FC<WorkOrderPrimaryActionButtonProps> = ({
  workOrder,
  organizationId: propOrganizationId
}) => {
  const descriptionId = useId();
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

  const primaryAction = buildWorkOrderStatusActions({
    status: workOrder.status,
    assigneeId: workOrder.assignee_id,
    canPerformStatusActions: canPerformStatusActions(),
    isManager,
    isTechnician,
    canComplete: canCompleteWorkOrder(),
    onStatusChange: handleStatusChange,
  }).find(action => action.label !== 'Cancel' && action.label !== 'Put on Hold');

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
          onClick={(e) => {
            e.stopPropagation();
            primaryAction.action();
          }}
          disabled={updateStatusMutation.isPending || acceptanceMutation.isPending || primaryAction.disabled}
          className="font-medium"
          title={primaryAction.description}
          aria-describedby={primaryAction.disabled ? descriptionId : undefined}
        >
          <IconComponent className="h-4 w-4 mr-2" />
          {primaryAction.label}
        </Button>
        
        {primaryAction.disabled && (
          <p id={descriptionId} className="mt-1 max-w-64 text-xs text-muted-foreground">
            {primaryAction.description}
          </p>
        )}
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
