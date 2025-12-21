
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import {
  getWorkOrderCosts,
  createWorkOrderCost,
  updateWorkOrderCost,
  deleteWorkOrderCost,
  type UpdateWorkOrderCostData
} from '@/features/work-orders/services/workOrderCostsService';

export const useWorkOrderCosts = (workOrderId: string) => {
  return useQuery({
    queryKey: ['work-order-costs', workOrderId],
    queryFn: () => getWorkOrderCosts(workOrderId),
    enabled: !!workOrderId
  });
};

export const useCreateWorkOrderCost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWorkOrderCost,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-order-costs', data.work_order_id] });
      toast.success('Cost item added successfully');
    },
    onError: (error) => {
      logger.error('Error creating cost item', error);
      toast.error('Failed to add cost item');
    }
  });
};

export const useUpdateWorkOrderCost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ costId, updateData }: { costId: string; updateData: UpdateWorkOrderCostData }) =>
      updateWorkOrderCost(costId, updateData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-order-costs', data.work_order_id] });
      toast.success('Cost item updated successfully');
    },
    onError: (error) => {
      logger.error('Error updating cost item', error);
      toast.error('Failed to update cost item');
    }
  });
};

export const useDeleteWorkOrderCost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteWorkOrderCost,
    onSuccess: () => {
      // We need to invalidate all cost queries since we don't have the work order ID in the response
      queryClient.invalidateQueries({ queryKey: ['work-order-costs'] });
      toast.success('Cost item deleted successfully');
    },
    onError: (error) => {
      logger.error('Error deleting cost item', error);
      toast.error('Failed to delete cost item');
    }
  });
};


