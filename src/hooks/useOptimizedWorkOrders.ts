/**
 * @deprecated This file is deprecated. Use hooks from '@/hooks/useWorkOrders' instead.
 * 
 * Migration guide:
 * - Replace `useOptimizedFilteredWorkOrders` with `useWorkOrders` or `useFilteredWorkOrders`
 * - Replace `useOptimizedMyWorkOrders` with `useMyWorkOrders`
 * - Replace `useOptimizedTeamWorkOrders` with `useTeamWorkOrders`
 * - Replace `useOptimizedEquipmentWorkOrders` with `useEquipmentWorkOrders`
 * - Replace `useOptimizedOverdueWorkOrders` with `useOverdueWorkOrders`
 * - Replace `useOptimizedWorkOrdersDueToday` with `useWorkOrdersDueToday`
 * 
 * This file is maintained for backward compatibility only.
 */

import {
  useFilteredWorkOrders,
  useMyWorkOrders,
  useTeamWorkOrders,
  useEquipmentWorkOrders,
  useOverdueWorkOrders,
  useWorkOrdersDueToday,
} from './useWorkOrders';
import type { WorkOrder } from '@/types/workOrder';
import type { WorkOrderFilters } from '@/services/WorkOrderService';

// Re-export types for backward compatibility
export type { WorkOrderFilters, WorkOrder } from '@/services/WorkOrderService';

/**
 * @deprecated Use useFilteredWorkOrders or useWorkOrders from '@/hooks/useWorkOrders' instead.
 */
export const useOptimizedFilteredWorkOrders = (
  organizationId: string, 
  filters?: WorkOrderFilters
) => {
  return useFilteredWorkOrders(organizationId, filters);
};

/**
 * @deprecated Use useMyWorkOrders from '@/hooks/useWorkOrders' instead.
 */
export const useOptimizedMyWorkOrders = (
  organizationId: string, 
  userId: string
) => {
  return useMyWorkOrders(organizationId, userId);
};

/**
 * @deprecated Use useTeamWorkOrders from '@/hooks/useWorkOrders' instead.
 */
export const useOptimizedTeamWorkOrders = (
  organizationId: string, 
  teamId: string, 
  status?: WorkOrder['status'] | 'all'
) => {
  return useTeamWorkOrders(organizationId, teamId, status);
};

/**
 * @deprecated Use useEquipmentWorkOrders from '@/hooks/useWorkOrders' instead.
 */
export const useOptimizedEquipmentWorkOrders = (
  organizationId: string, 
  equipmentId: string, 
  status?: WorkOrder['status'] | 'all'
) => {
  return useEquipmentWorkOrders(organizationId, equipmentId, status);
};

/**
 * @deprecated Use useOverdueWorkOrders from '@/hooks/useWorkOrders' instead.
 */
export const useOptimizedOverdueWorkOrders = (organizationId: string) => {
  return useOverdueWorkOrders(organizationId);
};

/**
 * @deprecated Use useWorkOrdersDueToday from '@/hooks/useWorkOrders' instead.
 */
export const useOptimizedWorkOrdersDueToday = (organizationId: string) => {
  return useWorkOrdersDueToday(organizationId);
};
