/**
 * @deprecated This hook is deprecated. Use useWorkOrders from '@/hooks/useWorkOrders' instead.
 * 
 * This file is maintained for backward compatibility only.
 */

import { useWorkOrders } from '@/hooks/useWorkOrders';

/**
 * @deprecated Use useWorkOrders from '@/hooks/useWorkOrders' instead.
 * 
 * OPTIMIZED: Uses WorkOrderService with consolidated query logic
 * Better caching strategy and reduced refetch frequency
 */
export const useOptimizedEnhancedWorkOrders = (organizationId?: string) => {
  return useWorkOrders(organizationId, {
    staleTime: 2 * 60 * 1000, // 2 minutes instead of 30 seconds
    refetchOnWindowFocus: false, // Prevent excessive refetching
  });
};

// Re-export type for backward compatibility
export type { WorkOrder } from '@/types/workOrder';
