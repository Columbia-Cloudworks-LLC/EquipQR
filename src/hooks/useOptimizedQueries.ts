import { useQuery, useQueries } from '@tanstack/react-query';
import { 
  getOptimizedTeamsByOrganization,
  getOptimizedWorkOrdersByOrganization,
  getOptimizedDashboardStats,
  getOptimizedEquipmentByOrganization,
  type Team,
  type WorkOrder,
  type DashboardStats,
  type Equipment
} from '@/services/optimizedSupabaseDataService';
import { useMemo } from 'react';

// Optimized hook with better caching and stale times
export const useOptimizedTeams = (organizationId?: string) => {
  return useQuery({
    queryKey: ['teams-optimized', organizationId],
    queryFn: () => organizationId ? getOptimizedTeamsByOrganization(organizationId) : [],
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes - teams don't change often
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });
};

// Optimized work orders with better caching strategy
export const useOptimizedWorkOrders = (organizationId?: string) => {
  return useQuery({
    queryKey: ['work-orders-optimized', organizationId],
    queryFn: () => organizationId ? getOptimizedWorkOrdersByOrganization(organizationId) : [],
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes - work orders change more frequently
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false, // Avoid excessive refetching
  });
};

// Dashboard with optimized parallel queries
export const useOptimizedDashboard = (organizationId?: string) => {
  return useQuery({
    queryKey: ['dashboard-optimized', organizationId],
    queryFn: () => organizationId ? getOptimizedDashboardStats(organizationId) : null,
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes for dashboard stats
    gcTime: 10 * 60 * 1000,
  });
};

// Equipment with smart caching
// @deprecated Use useEquipment from '@/components/equipment/hooks/useEquipment' instead. Will be removed in Phase 2.
export const useOptimizedEquipment = (organizationId?: string) => {
  return useQuery({
    queryKey: ['equipment-optimized', organizationId],
    queryFn: () => organizationId ? getOptimizedEquipmentByOrganization(organizationId) : [],
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
};

// Batch multiple queries efficiently when component needs multiple data sets
export const useOptimizedMultiQuery = (organizationId?: string) => {
  const queries = useQueries({
    queries: [
      {
        queryKey: ['teams-optimized', organizationId],
        queryFn: () => organizationId ? getOptimizedTeamsByOrganization(organizationId) : [],
        enabled: !!organizationId,
        staleTime: 10 * 60 * 1000,
      },
      {
        queryKey: ['work-orders-optimized', organizationId],
        queryFn: () => organizationId ? getOptimizedWorkOrdersByOrganization(organizationId) : [],
        enabled: !!organizationId,
        staleTime: 2 * 60 * 1000,
      },
      {
        queryKey: ['equipment-optimized', organizationId],
        queryFn: () => organizationId ? getOptimizedEquipmentByOrganization(organizationId) : [],
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

// Hook for computed/derived state with memoization
export const useWorkOrderStats = (organizationId?: string) => {
  const { data: workOrders = [] } = useOptimizedWorkOrders(organizationId);
  
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