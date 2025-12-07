/**
 * Query Hooks - Canonical hooks for data fetching
 * 
 * These hooks use consolidated services with optimized caching strategies.
 */

import { useQuery, useQueries } from '@tanstack/react-query';
import { 
  getOptimizedTeamsByOrganization,
  getOptimizedDashboardStats,
  type Team,
  type DashboardStats
} from '@/services/supabaseDataService';
import { WorkOrderService } from '@/services/WorkOrderService';
import { EquipmentService, Equipment } from '@/services/EquipmentService';
import { useMemo } from 'react';
import { useWorkOrders, workOrderKeys } from './useWorkOrders';
import type { WorkOrder } from '@/types/workOrder';

// Hook with better caching and stale times for teams
export const useTeams = (organizationId?: string) => {
  return useQuery({
    queryKey: ['teams-optimized', organizationId],
    queryFn: () => organizationId ? getOptimizedTeamsByOrganization(organizationId) : [],
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes - teams don't change often
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });
};

/**
 * @deprecated Use useTeams instead
 */
export const useOptimizedTeams = useTeams;

/**
 * Work orders with better caching strategy
 * Now uses the unified useWorkOrders hook internally
 */
export const useCachedWorkOrders = (organizationId?: string) => {
  return useWorkOrders(organizationId, {
    staleTime: 2 * 60 * 1000, // 2 minutes - work orders change more frequently
    refetchOnWindowFocus: false, // Avoid excessive refetching
  });
};

/**
 * @deprecated Use useCachedWorkOrders instead
 */
export const useOptimizedWorkOrders = useCachedWorkOrders;

// Dashboard with optimized parallel queries
export const useDashboard = (organizationId?: string) => {
  return useQuery({
    queryKey: ['dashboard-optimized', organizationId],
    queryFn: () => organizationId ? getOptimizedDashboardStats(organizationId) : null,
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes for dashboard stats
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * @deprecated Use useDashboard instead
 */
export const useOptimizedDashboard = useDashboard;

// Equipment with smart caching
// Now uses EquipmentService.getAll() - unified with useEquipment hook
export const useCachedEquipment = (organizationId?: string) => {
  return useQuery({
    queryKey: ['equipment', organizationId, {}, {}],
    queryFn: async () => {
      if (!organizationId) return [];
      const result = await EquipmentService.getAll(organizationId);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to fetch equipment');
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * @deprecated Use useCachedEquipment instead
 */
export const useOptimizedEquipment = useCachedEquipment;

// Batch multiple queries efficiently when component needs multiple data sets
export const useMultiQuery = (organizationId?: string) => {
  const queries = useQueries({
    queries: [
      {
        queryKey: ['teams-optimized', organizationId],
        queryFn: () => organizationId ? getOptimizedTeamsByOrganization(organizationId) : [],
        enabled: !!organizationId,
        staleTime: 10 * 60 * 1000,
      },
      {
        queryKey: workOrderKeys.list(organizationId || '', undefined),
        queryFn: async () => {
          if (!organizationId) return [];
          const service = new WorkOrderService(organizationId);
          const result = await service.getAll();
          if (result.success && result.data) {
            return result.data;
          }
          throw new Error(result.error || 'Failed to fetch work orders');
        },
        enabled: !!organizationId,
        staleTime: 2 * 60 * 1000,
      },
      {
        queryKey: ['equipment', organizationId, {}, {}],
        queryFn: async () => {
          if (!organizationId) return [];
          const result = await EquipmentService.getAll(organizationId);
          if (result.success && result.data) {
            return result.data;
          }
          throw new Error(result.error || 'Failed to fetch equipment');
        },
        enabled: !!organizationId,
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['dashboard-optimized', organizationId],
        queryFn: () => organizationId ? getOptimizedDashboardStats(organizationId) : null,
        enabled: !!organizationId,
        staleTime: 5 * 60 * 1000,
      }
    ]
  });

  return useMemo(() => {
    const [teamsQuery, workOrdersQuery, equipmentQuery, dashboardQuery] = queries;
    
    return {
      teams: {
        data: teamsQuery.data as Team[],
        isLoading: teamsQuery.isLoading,
        error: teamsQuery.error
      },
      workOrders: {
        data: workOrdersQuery.data as WorkOrder[],
        isLoading: workOrdersQuery.isLoading,
        error: workOrdersQuery.error
      },
      equipment: {
        data: equipmentQuery.data as Equipment[],
        isLoading: equipmentQuery.isLoading,
        error: equipmentQuery.error
      },
      dashboard: {
        data: dashboardQuery.data as DashboardStats,
        isLoading: dashboardQuery.isLoading,
        error: dashboardQuery.error
      },
      isLoading: queries.some(q => q.isLoading),
      isError: queries.some(q => q.isError)
    };
  }, [queries]);
};

/**
 * @deprecated Use useMultiQuery instead
 */
export const useOptimizedMultiQuery = useMultiQuery;

// Hook for computed/derived state with memoization
export const useWorkOrderStats = (organizationId?: string) => {
  const { data: workOrders = [] } = useCachedWorkOrders(organizationId);
  
  return useMemo(() => {
    const byStatus = workOrders.reduce((acc, wo) => {
      acc[wo.status] = (acc[wo.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPriority = workOrders.reduce((acc, wo) => {
      acc[wo.priority] = (acc[wo.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const overdue = workOrders.filter(wo => 
      wo.due_date && new Date(wo.due_date) < new Date() && wo.status !== 'completed'
    ).length;

    return {
      total: workOrders.length,
      byStatus,
      byPriority,
      overdue,
      completed: byStatus.completed || 0,
      pending: (byStatus.submitted || 0) + (byStatus.accepted || 0) + (byStatus.assigned || 0),
      inProgress: byStatus.in_progress || 0
    };
  }, [workOrders]);
};

// Re-export types for convenience
export type { WorkOrder } from '@/types/workOrder';
export type { Equipment } from '@/services/EquipmentService';
export type { Team, DashboardStats } from '@/services/supabaseDataService';

