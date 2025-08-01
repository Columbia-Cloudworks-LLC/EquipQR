import { useOrganization } from '@/contexts/OrganizationContext';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { useCreateWorkOrderEnhanced, EnhancedCreateWorkOrderData } from '@/hooks/useWorkOrderCreationEnhanced';
import { useUpdateWorkOrder, UpdateWorkOrderData } from '@/hooks/useWorkOrderUpdate';
import { useCreateHistoricalWorkOrder, HistoricalWorkOrderData } from '@/hooks/useHistoricalWorkOrders';
import { EnhancedWorkOrder } from '@/services/workOrderDataService';
import { WorkOrderFormData } from './useWorkOrderForm';
import { dateToISOString } from '@/lib/utils';

interface UseWorkOrderSubmissionProps {
  workOrder?: EnhancedWorkOrder;
  onSubmit?: (data: WorkOrderFormData) => void;
  onSuccess: () => void;
}

export const useWorkOrderSubmission = ({ workOrder, onSubmit, onSuccess }: UseWorkOrderSubmissionProps) => {
  const { currentOrganization } = useOrganization();
  const isEditMode = !!workOrder;

  // Always call hooks in the same order to avoid hook order violations
  const createWorkOrderMutation = useCreateWorkOrderEnhanced();
  const updateWorkOrderMutation = useUpdateWorkOrder();
  const createHistoricalWorkOrderMutation = useCreateHistoricalWorkOrder();

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
        onSuccess();
      } else {
        // Create new regular work order - handle UUID fields properly
        const workOrderData: EnhancedCreateWorkOrderData = {
          title: data.title,
          description: data.description,
          equipmentId: data.equipmentId,
          priority: data.priority,
          dueDate: data.dueDate || undefined,
          hasPM: data.hasPM || false,
          assignmentType: data.assignmentType === 'unassigned' ? undefined : data.assignmentType,
          assignmentId: (data.assignmentType === 'unassigned' || !data.assignmentId) ? undefined : data.assignmentId,
          equipmentWorkingHours: data.equipmentWorkingHours,
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