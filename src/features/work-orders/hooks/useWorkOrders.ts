/**
 * Work Orders Hooks - Unified hooks for work order data fetching
 * 
 * This file consolidates all work order query hooks into a single module.
 * Import hooks from here instead of useEnhancedWorkOrders or useOptimizedWorkOrders.
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { WorkOrderService, WorkOrderFilters, WorkOrder } from '@/features/work-orders/services/workOrderService';
import { createScopedQueryPersister } from '@/lib/queryPersistence';
import { workOrders as workOrderLibKeys } from '@/lib/queryKeys';
import { teamAccessQueryScope, resolveTeamReadScope } from '@/features/teams/utils/teamAccessScope';

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

const DEFAULT_STALE_TIME = 2 * 60 * 1000; // 2 minutes — prevents refetch on every SPA navigation

function fieldReadPersister() {
  return createScopedQueryPersister().persisterFn;
}

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
 * Fetch a single work order by ID
 */
export const useWorkOrderById = (
  organizationId: string,
  workOrderId: string,
  options?: {
    userTeamIds?: string[];
    isOrgAdmin?: boolean;
    enabled?: boolean;
  },
): UseQueryResult<WorkOrder | null, Error> => {
  const teamScope = resolveTeamReadScope(options);
  return useQuery({
    queryKey: workOrderLibKeys.detailScoped(
      organizationId,
      workOrderId,
      teamAccessQueryScope(teamScope.isOrgAdmin, teamScope.userTeamIds),
    ),
    queryFn: async (): Promise<WorkOrder | null> => {
      if (!organizationId || !workOrderId) return null;
      
      const service = new WorkOrderService(organizationId);
      const result = await service.getById(workOrderId, {
        userTeamIds: teamScope.userTeamIds,
        isOrgAdmin: teamScope.isOrgAdmin,
      });
      
      if (result.success && result.data) {
        return result.data;
      }
      
      // Don't throw for not found, return null
      if (result.error?.includes('not found')) {
        return null;
      }
      
      throw new Error(result.error || 'Failed to fetch work order');
    },
    enabled: !!organizationId && !!workOrderId && (options?.enabled ?? true),
    staleTime: DEFAULT_STALE_TIME,
    persister: fieldReadPersister(),
  });
};
