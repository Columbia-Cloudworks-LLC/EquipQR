// Hooks for managing work order equipment relationships
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getWorkOrderEquipment,
  getPrimaryEquipment,
  addEquipmentToWorkOrder,
  removeEquipmentFromWorkOrder,
  setPrimaryEquipment,
  getTeamEquipmentForWorkOrder,
  getWorkOrderEquipmentCount,
} from '@/features/work-orders/services/workOrderEquipmentService';
import type {
  AddEquipmentToWorkOrderParams,
  RemoveEquipmentFromWorkOrderParams,
  SetPrimaryEquipmentParams,
} from '@/features/work-orders/types/workOrderEquipment';

/**
 * Hook to fetch all equipment linked to a work order
 */
export const useWorkOrderEquipment = (workOrderId: string) => {
  return useQuery({
    queryKey: ['work-order-equipment', workOrderId],
    queryFn: () => getWorkOrderEquipment(workOrderId),
    enabled: !!workOrderId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch primary equipment for a work order
 */
export const usePrimaryEquipment = (workOrderId: string) => {
  return useQuery({
    queryKey: ['work-order-equipment', workOrderId, 'primary'],
    queryFn: () => getPrimaryEquipment(workOrderId),
    enabled: !!workOrderId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to fetch available equipment from the same team
 */
export const useTeamEquipmentForWorkOrder = (
  workOrderId: string,
  teamId: string | undefined,
  excludeIds: string[] = []
) => {
  return useQuery({
    queryKey: ['team-equipment-for-work-order', teamId, workOrderId, excludeIds],
    queryFn: () => getTeamEquipmentForWorkOrder(workOrderId, teamId!, excludeIds),
    enabled: !!teamId && !!workOrderId,
    staleTime: 2 * 60 * 1000, // 2 minutes (shorter for selection UI)
  });
};

/**
 * Hook to get count of equipment linked to a work order
 */
export const useWorkOrderEquipmentCount = (workOrderId: string) => {
  return useQuery({
    queryKey: ['work-order-equipment-count', workOrderId],
    queryFn: () => getWorkOrderEquipmentCount(workOrderId),
    enabled: !!workOrderId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to add equipment to a work order
 */
export const useAddEquipmentToWorkOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: AddEquipmentToWorkOrderParams) => addEquipmentToWorkOrder(params),
    onSuccess: (_, variables) => {
      // Invalidate work order equipment queries
      queryClient.invalidateQueries({
        queryKey: ['work-order-equipment', variables.workOrderId],
      });
      queryClient.invalidateQueries({
        queryKey: ['work-order-equipment-count', variables.workOrderId],
      });
      queryClient.invalidateQueries({
        queryKey: ['work-orders'],
      });

      toast.success('Equipment added to work order');
    },
    onError: (error: Error) => {
      console.error('Error adding equipment to work order:', error);
      toast.error(error.message || 'Failed to add equipment to work order');
    },
  });
};

/**
 * Hook to remove equipment from a work order
 */
export const useRemoveEquipmentFromWorkOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: RemoveEquipmentFromWorkOrderParams) =>
      removeEquipmentFromWorkOrder(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['work-order-equipment', variables.workOrderId],
      });
      queryClient.invalidateQueries({
        queryKey: ['work-order-equipment-count', variables.workOrderId],
      });
      queryClient.invalidateQueries({
        queryKey: ['work-orders'],
      });

      toast.success('Equipment removed from work order');
    },
    onError: (error: Error) => {
      console.error('Error removing equipment from work order:', error);
      toast.error(error.message || 'Failed to remove equipment from work order');
    },
  });
};

/**
 * Hook to set primary equipment for a work order
 */
export const useSetPrimaryEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SetPrimaryEquipmentParams) => setPrimaryEquipment(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['work-order-equipment', variables.workOrderId],
      });
      queryClient.invalidateQueries({
        queryKey: ['work-orders'],
      });

      toast.success('Primary equipment updated');
    },
    onError: (error: Error) => {
      console.error('Error setting primary equipment:', error);
      toast.error(error.message || 'Failed to set primary equipment');
    },
  });
};



