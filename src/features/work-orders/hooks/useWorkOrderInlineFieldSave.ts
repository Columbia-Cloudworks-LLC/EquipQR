import { useCallback } from 'react';
import {
  useUpdateWorkOrder,
  type UpdateWorkOrderData,
} from '@/features/work-orders/hooks/useWorkOrderUpdate';

type InlineWorkOrderField = keyof UpdateWorkOrderData;

export function useWorkOrderInlineFieldSave(
  workOrderId: string,
  serverUpdatedAt?: string | null,
) {
  const updateWorkOrderMutation = useUpdateWorkOrder();

  const saveField = useCallback(
    async (field: InlineWorkOrderField, value: UpdateWorkOrderData[InlineWorkOrderField]) => {
      await updateWorkOrderMutation.mutateAsync({
        workOrderId,
        data: { [field]: value },
        serverUpdatedAt: serverUpdatedAt ?? undefined,
      });
    },
    [serverUpdatedAt, updateWorkOrderMutation, workOrderId],
  );

  return {
    saveField,
    isSaving: updateWorkOrderMutation.isPending,
  };
}
