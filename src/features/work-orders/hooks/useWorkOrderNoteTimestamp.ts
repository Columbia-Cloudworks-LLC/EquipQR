import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useOrganization } from '@/contexts/OrganizationContext';
import { workOrders, workOrderMetrics } from '@/lib/queryKeys';
import { invalidateWorkOrderCaches } from '@/features/work-orders/utils/invalidateWorkOrderQueries';
import { updateHistoricalWorkOrderNoteTimestamp } from '@/features/work-orders/services/workOrderNotesService';

type UpdateHistoricalNoteTimestampVariables = {
  workOrderId: string;
  noteId: string;
  createdAt: string;
};

export function useUpdateHistoricalWorkOrderNoteTimestamp() {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workOrderId, noteId, createdAt }: UpdateHistoricalNoteTimestampVariables) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      if (currentOrganization.userRole !== 'owner' && currentOrganization.userRole !== 'admin') {
        throw new Error('Permission denied');
      }

      const result = await updateHistoricalWorkOrderNoteTimestamp(
        currentOrganization.id,
        workOrderId,
        noteId,
        createdAt,
      );

      if (!result.success) {
        throw new Error(result.error ?? 'Failed to update note timestamp');
      }

      return result;
    },
    onSuccess: (_result, variables) => {
      if (currentOrganization?.id) {
        invalidateWorkOrderCaches(queryClient, currentOrganization.id, variables.workOrderId);
        void queryClient.invalidateQueries({
          queryKey: workOrders.notesWithImages(variables.workOrderId),
        });
        void queryClient.invalidateQueries({
          queryKey: workOrders.images(variables.workOrderId),
        });
        void queryClient.invalidateQueries({
          queryKey: workOrderMetrics.imageCount(variables.workOrderId),
        });
      }
      toast.success('Note timestamp updated');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to update note timestamp';
      toast.error(message);
    },
  });
}
