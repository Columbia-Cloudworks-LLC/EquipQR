import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { UseMutationResult } from '@tanstack/react-query';
import { isOfflineId } from '@/features/work-orders/hooks/useOfflineMergedWorkOrders';

type PMData = { work_order_id: string } | null | undefined;

type InitializePMInput = {
  workOrderId: string;
  equipmentId: string;
  organizationId: string;
  templateId?: string;
};

type UseWorkOrderDetailsPMInitializationParams = {
  workOrderId?: string;
  workOrderEquipmentId?: string | null;
  hasPm?: boolean;
  pmData: PMData;
  pmLoading: boolean;
  pmError: unknown;
  workOrderLoading: boolean;
  selectedEquipmentId: string;
  organizationId?: string;
  isManager: boolean;
  isTechnician: boolean;
  defaultPmTemplateId?: string | null;
  initializePMChecklist: UseMutationResult<unknown, Error, InitializePMInput, unknown>;
};

export function useWorkOrderDetailsPMInitialization({
  workOrderId,
  workOrderEquipmentId,
  hasPm,
  pmData,
  pmLoading,
  pmError,
  workOrderLoading,
  selectedEquipmentId,
  organizationId,
  isManager,
  isTechnician,
  defaultPmTemplateId,
  initializePMChecklist,
}: UseWorkOrderDetailsPMInitializationParams) {
  const [pmInitializing, setPmInitializing] = useState(false);
  const pmInitializationAttempted = useRef<string | null>(null);

  useEffect(() => {
    const workOrderKey =
      workOrderId && workOrderEquipmentId
        ? `${workOrderId}-${selectedEquipmentId || workOrderEquipmentId}`
        : null;

    const shouldInitializePM =
      workOrderKey &&
      workOrderKey !== pmInitializationAttempted.current &&
      hasPm &&
      !pmData &&
      !pmLoading &&
      !pmError &&
      !pmInitializing &&
      !workOrderLoading &&
      !isOfflineId(workOrderId!) &&
      workOrderEquipmentId &&
      organizationId &&
      (isManager || isTechnician);

    if (shouldInitializePM) {
      pmInitializationAttempted.current = workOrderKey;
      setPmInitializing(true);
      const equipmentId = selectedEquipmentId || workOrderEquipmentId;

      initializePMChecklist.mutate(
        {
          workOrderId: workOrderId!,
          equipmentId,
          organizationId,
          templateId: defaultPmTemplateId || undefined,
        },
        {
          onSuccess: (result) => {
            if (result !== null) {
              toast.success('PM checklist initialized');
            }
            setPmInitializing(false);
          },
          onError: (error) => {
            console.error('Failed to initialize PM:', error);
            toast.error('Failed to initialize PM checklist');
            setPmInitializing(false);
            pmInitializationAttempted.current = null;
          },
        },
      );
    }

    if (pmData && pmInitializationAttempted.current === workOrderKey) {
      if (pmData.work_order_id === workOrderId) {
        pmInitializationAttempted.current = null;
      }
    }
  }, [
    hasPm,
    workOrderId,
    workOrderEquipmentId,
    pmData,
    pmLoading,
    pmInitializing,
    workOrderLoading,
    selectedEquipmentId,
    organizationId,
    isManager,
    isTechnician,
    defaultPmTemplateId,
    initializePMChecklist,
    pmError,
  ]);

  return { pmInitializing };
}
