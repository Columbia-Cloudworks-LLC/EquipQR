/**
 * Work Orders Hooks - Unified hooks for work order data fetching
 * 
 * This file consolidates all work order query hooks into a single module.
 * Import hooks from here instead of useEnhancedWorkOrders or useOptimizedWorkOrders.
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { WorkOrderService, WorkOrderFilters, WorkOrder } from '@/features/work-orders/services/workOrderService';

// Re-export types for convenience
export type { WorkOrderFilters, WorkOrder } from '@/features/work-orders/services/workOrderService';

// ============================================
// Query Keys
// ============================================

/**
 * Centralized query keys for work orders
 * Use these for consistent cache invalidation
 */
export const workOrderKeys = {
  all: ['work-orders'] as const,
  lists: () => [...workOrderKeys.all, 'list'] as const,
  list: (orgId: string, filters?: WorkOrderFilters) => 
    [...workOrderKeys.lists(), orgId, filters] as const,
  details: () => [...workOrderKeys.all, 'detail'] as const,
  detail: (orgId: string, id: string) => 
    [...workOrderKeys.details(), orgId, id] as const,
  // Specialized list queries
  myWorkOrders: (orgId: string, userId: string) => 
    [...workOrderKeys.lists(), orgId, { assigneeId: userId }] as const,
  teamWorkOrders: (orgId: string, teamId: string, status?: string) => 
    [...workOrderKeys.lists(), orgId, { teamId, status }] as const,
  equipmentWorkOrders: (orgId: string, equipmentId: string, status?: string) => 
    [...workOrderKeys.lists(), orgId, { equipmentId, status }] as const,
  overdue: (orgId: string) => 
    [...workOrderKeys.lists(), orgId, { dueDateFilter: 'overdue' }] as const,
  dueToday: (orgId: string) => 
    [...workOrderKeys.lists(), orgId, { dueDateFilter: 'today' }] as const,
};

// ============================================
// Cache Configuration
// ============================================

const DEFAULT_STALE_TIME = 30 * 1000; // 30 seconds
const EXTENDED_STALE_TIME = 60 * 1000; // 1 minute for less frequently changing data

// ============================================
// Main Hook
// ============================================

export interface UseWorkOrdersOptions {
  /** Filters to apply to the query */
  filters?: WorkOrderFilters;
  /** Whether the query is enabled (default: true when orgId is provided) */
  enabled?: boolean;
  /** Custom stale time in milliseconds */
  staleTime?: number;
  /** Whether to refetch on window focus (default: true) */
  refetchOnWindowFocus?: boolean;
}

/**
 * Primary hook for fetching work orders
 * 
 * @param organizationId - The organization ID to fetch work orders for
 * @param options - Query options including filters
 * @returns TanStack Query result with work orders
 * 
 * @example
 * // Fetch all work orders
 * const { data: workOrders } = useWorkOrders(orgId);
 * 
 * @example
 * // Fetch with filters
 * const { data: workOrders } = useWorkOrders(orgId, {
 *   filters: { status: 'in_progress', assigneeId: userId }
 * });
 */
export const useWorkOrders = (
  organizationId?: string,
  options: UseWorkOrdersOptions = {}
): UseQueryResult<WorkOrder[], Error> => {
  const {
    filters,
    enabled = true,
    staleTime = DEFAULT_STALE_TIME,
    refetchOnWindowFocus = true,
  } = options;

  return useQuery({
    queryKey: workOrderKeys.list(organizationId || '', filters),
    queryFn: async (): Promise<WorkOrder[]> => {
      if (!organizationId) return [];
      
      const service = new WorkOrderService(organizationId);
      const response = await service.getAll(filters);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch work orders');
      }
      
      return response.data || [];
    },
    enabled: !!organizationId && enabled,
    staleTime,
    refetchOnWindowFocus,
    refetchOnMount: true,
  });
};

// ============================================
// Specialized Hooks
// ============================================

/**
 * Fetch work orders assigned to a specific user
 */
export const useMyWorkOrders = (
  organizationId: string,
  userId: string
): UseQueryResult<WorkOrder[], Error> => {
  return useQuery({
    queryKey: workOrderKeys.myWorkOrders(organizationId, userId),
    queryFn: async (): Promise<WorkOrder[]> => {
      const service = new WorkOrderService(organizationId);
      const result = await service.getMyWorkOrders(userId);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch my work orders');
    },
    enabled: !!organizationId && !!userId,
    staleTime: DEFAULT_STALE_TIME,
  });
};

/**
 * Fetch work orders for a specific team
 */
export const useTeamWorkOrders = (
  organizationId: string,
  teamId: string,
  status?: WorkOrder['status'] | 'all'
): UseQueryResult<WorkOrder[], Error> => {
  return useQuery({
    queryKey: workOrderKeys.teamWorkOrders(organizationId, teamId, status),
    queryFn: async (): Promise<WorkOrder[]> => {
      const service = new WorkOrderService(organizationId);
      const result = await service.getTeamWorkOrders(teamId, status);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch team work orders');
    },
    enabled: !!organizationId && !!teamId,
    staleTime: DEFAULT_STALE_TIME,
  });
};

/**
 * Fetch work orders for specific equipment
 */
export const useEquipmentWorkOrders = (
  organizationId: string,
  equipmentId: string,
  status?: WorkOrder['status'] | 'all'
): UseQueryResult<WorkOrder[], Error> => {
  return useQuery({
    queryKey: workOrderKeys.equipmentWorkOrders(organizationId, equipmentId, status),
    queryFn: async (): Promise<WorkOrder[]> => {
      const service = new WorkOrderService(organizationId);
      const result = await service.getEquipmentWorkOrders(equipmentId, status);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch equipment work orders');
    },
    enabled: !!organizationId && !!equipmentId,
    staleTime: DEFAULT_STALE_TIME,
  });
};

/**
 * Fetch overdue work orders
 */
export const useOverdueWorkOrders = (
  organizationId: string
): UseQueryResult<WorkOrder[], Error> => {
  return useQuery({
    queryKey: workOrderKeys.overdue(organizationId),
    queryFn: async (): Promise<WorkOrder[]> => {
      const service = new WorkOrderService(organizationId);
      const result = await service.getOverdueWorkOrders();
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch overdue work orders');
    },
    enabled: !!organizationId,
    staleTime: EXTENDED_STALE_TIME,
  });
};

/**
 * Fetch work orders due today
 */
export const useWorkOrdersDueToday = (
  organizationId: string
): UseQueryResult<WorkOrder[], Error> => {
  return useQuery({
    queryKey: workOrderKeys.dueToday(organizationId),
    queryFn: async (): Promise<WorkOrder[]> => {
      const service = new WorkOrderService(organizationId);
      const result = await service.getWorkOrdersDueToday();
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch work orders due today');
    },
    enabled: !!organizationId,
    staleTime: EXTENDED_STALE_TIME,
  });
};

/**
 * Fetch a single work order by ID
 */
export const useWorkOrderById = (
  organizationId: string,
  workOrderId: string
): UseQueryResult<WorkOrder | null, Error> => {
  return useQuery({
    queryKey: workOrderKeys.detail(organizationId, workOrderId),
    queryFn: async (): Promise<WorkOrder | null> => {
      if (!organizationId || !workOrderId) return null;
      
      const service = new WorkOrderService(organizationId);
      const result = await service.getById(workOrderId);
      
      if (result.success && result.data) {
        return result.data;
      }
      
      // Don't throw for not found, return null
      if (result.error?.includes('not found')) {
        return null;
      }
      
      throw new Error(result.error || 'Failed to fetch work order');
    },
    enabled: !!organizationId && !!workOrderId,
    staleTime: DEFAULT_STALE_TIME,
  });
};

// ============================================
// Filtered Hook (replaces useOptimizedFilteredWorkOrders)
// ============================================

/**
 * Fetch work orders with specific filters
 * This is a convenience wrapper around useWorkOrders for explicit filter usage
 */
export const useFilteredWorkOrders = (
  organizationId: string,
  filters?: WorkOrderFilters
): UseQueryResult<WorkOrder[], Error> => {
  return useWorkOrders(organizationId, { filters });
};

