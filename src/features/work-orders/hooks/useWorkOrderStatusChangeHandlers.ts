import { useCallback } from 'react';
import { useUpdateWorkOrderStatus } from '@/features/work-orders/hooks/useWorkOrderData';
import { useWorkOrderAcceptance } from '@/features/work-orders/hooks/useWorkOrderAcceptance';
import { usePMByWorkOrderId } from '@/features/pm-templates/hooks/usePMData';
import { useWorkOrderPermissionLevels } from '@/features/work-orders/hooks/useWorkOrderPermissionLevels';
import { useAuth } from '@/hooks/useAuth';

type WorkOrderStatus =
  | 'submitted'
  | 'accepted'
  | 'assigned'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

type StatusChangeWorkOrder = {
  id: string;
  status: WorkOrderStatus;
  has_pm?: boolean;
  assignee_id?: string | null;
  created_by?: string | null;
};

export function useWorkOrderStatusChangeHandlers(
  workOrder: StatusChangeWorkOrder,
  organizationId: string,
  onAccepted?: () => void,
  onCancelled?: () => void,
  onCompleted?: () => void,
) {
  const updateStatusMutation = useUpdateWorkOrderStatus();
  const acceptanceMutation = useWorkOrderAcceptance();
  const { data: pmData } = usePMByWorkOrderId(workOrder.id);
  const { isManager, isTechnician } = useWorkOrderPermissionLevels();
  const { user } = useAuth();

  const canPerformStatusActions = useCallback(() => {
    if (isManager) return true;
    if (isTechnician && workOrder.assignee_id === user?.id) return true;
    if (workOrder.created_by === user?.id && workOrder.status === 'submitted') {
      return true;
    }
    return false;
  }, [
    isManager,
    isTechnician,
    workOrder.assignee_id,
    workOrder.created_by,
    workOrder.status,
    user?.id,
  ]);

  const canCompleteWorkOrder = useCallback(() => {
    return !workOrder.has_pm || (pmData && pmData.status === 'completed');
  }, [workOrder.has_pm, pmData]);

  const handleStatusChange = useCallback(
    async (newStatus: WorkOrderStatus) => {
      if (newStatus === 'completed' && workOrder.has_pm && pmData) {
        if (pmData.status !== 'completed') {
          return;
        }
      }

      if (newStatus === 'accepted') {
        onAccepted?.();
        return;
      }

      if (newStatus === 'cancelled') {
        onCancelled?.();
        return;
      }

      if (newStatus === 'completed') {
        onCompleted?.();
        return;
      }

      try {
        await updateStatusMutation.mutateAsync({
          workOrderId: workOrder.id,
          status: newStatus,
          organizationId,
        });
      } catch (error) {
        console.error('Error updating work order status:', error);
      }
    },
    [
      workOrder.has_pm,
      workOrder.id,
      pmData,
      onAccepted,
      onCancelled,
      onCompleted,
      organizationId,
      updateStatusMutation,
    ],
  );

  const handleAcceptanceComplete = useCallback(
    async (assigneeId?: string) => {
      try {
        await acceptanceMutation.mutateAsync({
          workOrderId: workOrder.id,
          organizationId,
          assigneeId,
        });
      } catch (error) {
        console.error('Error accepting work order:', error);
        throw error;
      }
    },
    [acceptanceMutation, organizationId, workOrder.id],
  );

  return {
    updateStatusMutation,
    acceptanceMutation,
    pmData,
    isManager,
    isTechnician,
    canPerformStatusActions,
    canCompleteWorkOrder,
    handleStatusChange,
    handleAcceptanceComplete,
  };
}
