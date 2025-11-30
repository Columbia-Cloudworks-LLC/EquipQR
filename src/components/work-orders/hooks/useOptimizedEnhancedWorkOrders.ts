import { useQuery } from '@tanstack/react-query';
import { WorkOrderService, WorkOrder } from '@/services/WorkOrderService';

// OPTIMIZED: Uses WorkOrderService with consolidated query logic
// Better caching strategy and reduced refetch frequency
export const useOptimizedEnhancedWorkOrders = (organizationId?: string) => {
  return useQuery({
    queryKey: ['work-orders', organizationId],
    queryFn: async (): Promise<WorkOrder[]> => {
      if (!organizationId) return [];
      const service = new WorkOrderService(organizationId);
      const result = await service.getAll();
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch work orders');
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes instead of 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Prevent excessive refetching
    refetchOnMount: false, // Don't always refetch on mount
    refetchInterval: false, // Disable automatic refetching
  });
};

export type { WorkOrder } from '@/services/WorkOrderService';
