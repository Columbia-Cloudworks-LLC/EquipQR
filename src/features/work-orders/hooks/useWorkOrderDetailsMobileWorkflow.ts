import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { WorkOrderStatus } from '@/features/work-orders/types/workOrder';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import { useWorkOrderStatusUpdate } from '@/features/work-orders/hooks/useWorkOrderStatusUpdate';
import { useWorkOrderAcceptance } from '@/features/work-orders/hooks/useWorkOrderAcceptance';
import type { useWorkTimer } from '@/features/work-orders/hooks/useWorkTimer';

type WorkTimer = ReturnType<typeof useWorkTimer>;

type UseWorkOrderDetailsMobileWorkflowParams = {
  workOrder: WorkOrder | null | undefined;
  organizationId?: string;
  workTimer: WorkTimer;
};

export function useWorkOrderDetailsMobileWorkflow({
  workOrder,
  organizationId,
  workTimer,
}: UseWorkOrderDetailsMobileWorkflowParams) {
  const [showMobileActionSheet, setShowMobileActionSheet] = useState(false);
  const [showMobileCompleteDialog, setShowMobileCompleteDialog] = useState(false);
  const [showFieldAcceptDialog, setShowFieldAcceptDialog] = useState(false);
  const [showMobilePDFDialog, setShowMobilePDFDialog] = useState(false);
  const [mobilePdfDialogFocusDrive, setMobilePdfDialogFocusDrive] = useState(false);
  const [mobileReviewOpen, setMobileReviewOpen] = useState(false);

  const openMobilePdfDialog = useCallback((focusDrive = false) => {
    setMobilePdfDialogFocusDrive(focusDrive);
    window.setTimeout(() => {
      setShowMobilePDFDialog(true);
    }, 0);
  }, []);

  const mobileStatusMutation = useWorkOrderStatusUpdate();
  const fieldAcceptanceMutation = useWorkOrderAcceptance();

  const updateMobileStatus = useCallback(
    (newStatus: WorkOrderStatus, onSuccess?: () => void) => {
      if (!workOrder) return;
      mobileStatusMutation.mutate(
        {
          workOrderId: workOrder.id,
          newStatus,
          serverUpdatedAt: workOrder.updated_at ?? undefined,
        },
        { onSuccess },
      );
    },
    [mobileStatusMutation, workOrder],
  );

  const startMobileWorkOrder = useCallback(() => {
    updateMobileStatus('in_progress', () => {
      workTimer.start();
    });
  }, [updateMobileStatus, workTimer]);

  const putAssignedMobileWorkOrderOnHold = useCallback(() => {
    updateMobileStatus('on_hold');
  }, [updateMobileStatus]);

  const pauseResumeMobileWorkOrder = useCallback(() => {
    if (!workOrder) return;
    const newStatus: WorkOrderStatus = workOrder.status === 'on_hold' ? 'in_progress' : 'on_hold';
    updateMobileStatus(newStatus, () => {
      if (newStatus === 'on_hold') {
        workTimer.pause();
        toast('Work order paused', {
          action: {
            label: 'Undo',
            onClick: () => {
              updateMobileStatus('in_progress', () => workTimer.start());
            },
          },
          duration: 5000,
        });
      } else {
        workTimer.start();
      }
    });
  }, [updateMobileStatus, workOrder, workTimer]);

  const handleFieldAcceptComplete = useCallback(
    async (assigneeId?: string) => {
      if (!workOrder || !organizationId) return;
      await fieldAcceptanceMutation.mutateAsync({
        workOrderId: workOrder.id,
        organizationId,
        assigneeId,
      });
      setShowFieldAcceptDialog(false);
    },
    [fieldAcceptanceMutation, organizationId, workOrder],
  );

  const completeMobileWorkOrder = useCallback(() => {
    if (!workOrder) return;
    const hoursWorked = Math.round((workTimer.elapsedSeconds / 3600) * 100) / 100;
    mobileStatusMutation.mutate(
      {
        workOrderId: workOrder.id,
        newStatus: 'completed',
        serverUpdatedAt: workOrder.updated_at ?? undefined,
      },
      {
        onSuccess: () => {
          workTimer.stopAndGetHours();
          setShowMobileCompleteDialog(false);
          if (hoursWorked > 0) {
            toast.success(`Timer stopped: ${hoursWorked.toFixed(2)} hours worked`);
          }
        },
      },
    );
  }, [mobileStatusMutation, workOrder, workTimer]);

  return {
    showMobileActionSheet,
    setShowMobileActionSheet,
    showMobileCompleteDialog,
    setShowMobileCompleteDialog,
    showFieldAcceptDialog,
    setShowFieldAcceptDialog,
    showMobilePDFDialog,
    setShowMobilePDFDialog,
    mobilePdfDialogFocusDrive,
    openMobilePdfDialog,
    mobileReviewOpen,
    setMobileReviewOpen,
    mobileStatusMutation,
    fieldAcceptanceMutation,
    startMobileWorkOrder,
    putAssignedMobileWorkOrderOnHold,
    pauseResumeMobileWorkOrder,
    handleFieldAcceptComplete,
    completeMobileWorkOrder,
  };
}
