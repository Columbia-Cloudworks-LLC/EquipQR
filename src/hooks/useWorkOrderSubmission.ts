

import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { useCreateWorkOrder, CreateWorkOrderData } from '@/components/work-orders/hooks/useWorkOrderCreation';
import { useUpdateWorkOrder, UpdateWorkOrderData } from '@/hooks/useWorkOrderUpdate';
import { useCreateHistoricalWorkOrder, HistoricalWorkOrderData } from '@/hooks/useHistoricalWorkOrders';
import type { WorkOrder as EnhancedWorkOrder } from '@/types/workOrder';
import { WorkOrderFormData } from './useWorkOrderForm';
import { dateToISOString } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface UseWorkOrderSubmissionProps {
  workOrder?: EnhancedWorkOrder;
  onSubmit?: (data: WorkOrderFormData) => void;
  onSuccess: () => void;
}

export const useWorkOrderSubmission = ({ workOrder, onSubmit, onSuccess }: UseWorkOrderSubmissionProps) => {
  
  const navigate = useNavigate();
  const isEditMode = !!workOrder;

  // Always call hooks in the same order to avoid hook order violations
  const createWorkOrderMutation = useCreateWorkOrder();
  const updateWorkOrderMutation = useUpdateWorkOrder();
  const createHistoricalWorkOrderMutation = useCreateHistoricalWorkOrder({
    onSuccess: (createdWorkOrder) => {
      navigate(`/dashboard/work-orders/${createdWorkOrder.id}`);
      onSuccess();
    }
  });

  const { execute: submitForm, isLoading: isSubmitting } = useAsyncOperation(
    async (data: WorkOrderFormData) => {
      if (onSubmit) {
        await onSubmit(data);
        onSuccess();
      } else if (isEditMode && workOrder) {
        // Update existing work order
        const updateData: UpdateWorkOrderData = {
          title: data.title,
          description: data.description,
          priority: data.priority,
          dueDate: data.dueDate || undefined,
          estimatedHours: data.estimatedHours || undefined,
          hasPM: data.hasPM,
        };
        
        await updateWorkOrderMutation.mutateAsync({
          workOrderId: workOrder.id,
          data: updateData
        });
        onSuccess();
      } else if (data.isHistorical) {
        // Create historical work order - handle UUID fields properly
        const historicalData: HistoricalWorkOrderData = {
          equipmentId: data.equipmentId,
          title: data.title,
          description: data.description,
          priority: data.priority,
          status: data.status || 'accepted',
          historicalStartDate: dateToISOString(data.historicalStartDate) || '',
          historicalNotes: data.historicalNotes || '',
          assigneeId: data.assignmentType === 'user' && data.assignmentId ? data.assignmentId : undefined,
          teamId: data.assignmentType === 'team' && data.assignmentId ? data.assignmentId : undefined,
          dueDate: data.dueDate || undefined,
          completedDate: dateToISOString(data.completedDate) || undefined,
          hasPM: data.hasPM || false,
          pmStatus: 'pending',
          pmCompletionDate: undefined,
          pmNotes: '',
          pmChecklistData: []
        };
        
        await createHistoricalWorkOrderMutation.mutateAsync(historicalData);
        // Navigation and success handled by the hook's onSuccess callback
      } else {
        // Create new regular work order - handle UUID fields properly
        const workOrderData: CreateWorkOrderData = {
          title: data.title,
          description: data.description,
          equipmentId: data.equipmentId,
          priority: data.priority,
          dueDate: data.dueDate || undefined,
          estimatedHours: data.estimatedHours || undefined,
          equipmentWorkingHours: data.equipmentWorkingHours || undefined,
          hasPM: data.hasPM || false,
          pmTemplateId: data.pmTemplateId || undefined,
          assignmentType: data.assignmentType === 'unassigned' ? undefined : data.assignmentType,
          assignmentId: (data.assignmentType === 'unassigned' || !data.assignmentId) ? undefined : data.assignmentId,
        };
        
        await createWorkOrderMutation.mutateAsync(workOrderData);
        // For regular work orders, let the hook handle success callback
      }
    }
  );

  const isLoading = isSubmitting || createWorkOrderMutation.isPending || updateWorkOrderMutation.isPending || createHistoricalWorkOrderMutation.isPending;

  return {
    submitForm,
    isLoading,
    isEditMode,
  };
};
