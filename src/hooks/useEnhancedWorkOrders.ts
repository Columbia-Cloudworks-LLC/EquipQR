import { useQuery } from '@tanstack/react-query';
import { WorkOrderService, WorkOrder } from '@/services/WorkOrderService';

/**
 * Hook to fetch enhanced work orders using WorkOrderService
 * @param organizationId - The organization ID to fetch work orders for
 * @returns TanStack Query result with work orders
 */
export const useEnhancedWorkOrders = (organizationId?: string) => {
  return useQuery({
    queryKey: ['enhanced-work-orders', organizationId],
    queryFn: async (): Promise<WorkOrder[]> => {
      if (!organizationId) return [];
      
      const service = new WorkOrderService(organizationId);
      const response = await service.getAll();
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch work orders');
      }
      
      return response.data || [];
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000, // 30 seconds - reduced for more frequent updates
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
    refetchOnMount: true, // Always refetch when component mounts
  });
};

// Re-export WorkOrder type for backward compatibility
export type { WorkOrder } from '@/services/WorkOrderService';
