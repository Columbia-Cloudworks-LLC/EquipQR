/**
 * @deprecated This hook is deprecated. Use useWorkOrders from '@/hooks/useWorkOrders' instead.
 * 
 * Migration guide:
 * - Replace `useEnhancedWorkOrders(orgId)` with `useWorkOrders(orgId)`
 * - Replace `EnhancedWorkOrder` type with `WorkOrder` from '@/types/workOrder'
 * 
 * This file is maintained for backward compatibility only.
 */

import { useWorkOrders } from './useWorkOrders';
import type { WorkOrder } from '@/types/workOrder';

/**
 * @deprecated Use useWorkOrders from '@/hooks/useWorkOrders' instead.
 * 
 * Hook to fetch work orders using WorkOrderService
 * @param organizationId - The organization ID to fetch work orders for
 * @returns TanStack Query result with work orders
 */
export const useEnhancedWorkOrders = (organizationId?: string) => {
  return useWorkOrders(organizationId, {
    // Maintain original behavior
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
};

// Re-export WorkOrder type for backward compatibility
export type { WorkOrder } from '@/types/workOrder';

/**
 * @deprecated Use WorkOrder from '@/types/workOrder' instead.
 */
export type EnhancedWorkOrder = WorkOrder;
