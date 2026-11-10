

import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { useCreateWorkOrder } from '@/features/work-orders/hooks/useWorkOrderCreation';
import { useUpdateWorkOrder, UpdateWorkOrderData } from '@/features/work-orders/hooks/useWorkOrderUpdate';
import { useCreateHistoricalWorkOrder, HistoricalWorkOrderData } from '@/features/work-orders/hooks/useHistoricalWorkOrders';
import type { WorkOrder as EnhancedWorkOrder } from '@/features/work-orders/types/workOrder';
import type { PMChecklistItem } from '@/features/pm-templates/services/preventativeMaintenanceService';
import { useAuth } from '@/hooks/useAuth';
import { WorkOrderFormData } from './useWorkOrderForm';
import { parseDue, persistDue } from '@/features/work-orders/calendar';
import { buildCreateWorkOrderData } from '@/features/work-orders/utils/buildCreateWorkOrderData';
import { dateToISOString } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  synthesizeDefaultTimeline,
} from '@/features/work-orders/utils/historicalTimeline';

interface UseWorkOrderSubmissionProps {
  workOrder?: EnhancedWorkOrder;
  onSubmit?: (data: WorkOrderFormData) => void;
  onSuccess: () => void;
  /** Photos to attach after online work order create (create mode only) */
  creationImages?: File[];
  /** Stay on the current page after a create instead of opening the new work order. */
  keepOpen?: boolean;
  /** Rapid entry: use the quieter "Work Order saved" toast. */
  rapidEntry?: boolean;
  /** Called with the new work order id after a successful create. */
  onCreated?: (workOrderId: string) => void;
  /**
   * Log Completed: checklist as it was on the paper sheet (already rated).
   * Read at submit time so the latest edits are sent.
   */
  getHistoricalChecklist?: () => PMChecklistItem[] | undefined;
}

const RAPID_ENTRY_TOAST = 'Work Order saved';

export const useWorkOrderSubmission = ({
  workOrder,
  onSubmit,
  onSuccess,
  creationImages = [],
  keepOpen = false,
  rapidEntry = false,
  onCreated,
  getHistoricalChecklist,
}: UseWorkOrderSubmissionProps) => {
  const { user } = useAuth();

  const navigate = useNavigate();
  const isEditMode = !!workOrder;

  // Always call hooks in the same order to avoid hook order violations
  const createWorkOrderMutation = useCreateWorkOrder(
    keepOpen
      ? {
          successMessage: rapidEntry ? RAPID_ENTRY_TOAST : undefined,
          onSuccess: (created) => onCreated?.(created.id),
        }
      : undefined,
  );
  const updateWorkOrderMutation = useUpdateWorkOrder();
  const createHistoricalWorkOrderMutation = useCreateHistoricalWorkOrder({
    successMessage: rapidEntry ? RAPID_ENTRY_TOAST : undefined,
    onSuccess: (createdWorkOrder) => {
      if (keepOpen) {
        onCreated?.(createdWorkOrder.id);
      } else {
        navigate(`/dashboard/work-orders/${createdWorkOrder.id}`);
      }
      onSuccess();
    }
  });

  const { execute: submitForm, isLoading: isSubmitting } = useAsyncOperation<
    void,
    [data: WorkOrderFormData]
  >(
    async (data) => {
      const persistedDue = persistDue(parseDue({
        dueDate: data.dueDate,
        dueDateHasTime: data.dueDateHasTime,
      }));

      if (onSubmit) {
        await onSubmit(data);
        onSuccess();
      } else if (isEditMode && workOrder) {
        // Update existing work order
        const updateData: UpdateWorkOrderData = {
          title: data.title,
          description: data.description,
          priority: data.priority,
          dueDate: persistedDue.dueDate ?? undefined,
          dueDateHasTime: persistedDue.dueDateHasTime,
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
        const isLoggedCompleted = data.status === 'completed';
        const historicalAssigneeId =
          data.assigneeId || (isLoggedCompleted ? user?.id : undefined) || undefined;
        const timelineEvents = data.historicalTimelineEvents && data.historicalTimelineEvents.length > 0
          ? data.historicalTimelineEvents
          : (data.historicalStartDate && data.status
            ? synthesizeDefaultTimeline({
                startDate: data.historicalStartDate,
                finalStatus: data.status,
                completedDate:
                  data.status === 'completed' || data.status === 'cancelled'
                    ? data.completedDate ?? null
                    : null,
                assigneeId: historicalAssigneeId ?? null,
              })
            : undefined);

        const historicalData: HistoricalWorkOrderData = {
          equipmentId: data.equipmentId,
          title: data.title,
          description: data.description,
          priority: data.priority,
          status: timelineEvents?.[timelineEvents.length - 1]?.newStatus ?? data.status ?? 'accepted',
          historicalStartDate: dateToISOString(data.historicalStartDate) || '',
          historicalNotes: data.historicalNotes || '',
          // A completed timeline passes through "assigned", which needs a person.
          // Paper sheets logged without one are recorded under whoever entered them.
          assigneeId: historicalAssigneeId,
          dueDate: persistedDue.dueDate ?? undefined,
          dueDateHasTime: persistedDue.dueDateHasTime,
          completedDate: dateToISOString(data.completedDate) || undefined,
          hasPM: data.hasPM || false,
          // A PM logged on a completed work order was completed on the service date.
          pmStatus: isLoggedCompleted && data.hasPM ? 'completed' : 'pending',
          pmCompletionDate:
            isLoggedCompleted && data.hasPM ? dateToISOString(data.completedDate) || undefined : undefined,
          pmNotes: '',
          pmChecklistData: (isLoggedCompleted && data.hasPM ? getHistoricalChecklist?.() : undefined) ?? [],
          pmTemplateId: data.hasPM ? data.pmTemplateId || undefined : undefined,
          timelineEvents,
          serviceHours: data.equipmentWorkingHours ?? undefined,
          quickBooksSyncReady: data.quickBooksSyncReady === true,
          images: creationImages.length ? creationImages : undefined,
          creationPhotoNote: creationImages.length
            ? `Paper sheet / photos for logged work order: ${data.title}`
            : undefined,
        };
        
        await createHistoricalWorkOrderMutation.mutateAsync(historicalData);
        // Navigation and success handled by the hook's onSuccess callback
      } else {
        // Create new regular work order - handle UUID fields properly
        await createWorkOrderMutation.mutateAsync(
          buildCreateWorkOrderData(data, creationImages),
        );
        // Always hand control back: the dialog may be mounted globally (keyboard
        // shortcut launcher) where navigating to the new work order does not
        // unmount it, and rapid entry needs the reset-for-next callback.
        onSuccess();
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
