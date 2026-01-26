import { useQueries } from '@tanstack/react-query';
import {
  getTeamEquipmentStats,
  getTeamWorkOrderStats,
  getTeamRecentEquipment,
  getTeamRecentWorkOrders,
  type TeamEquipmentStats,
  type TeamWorkOrderStats,
  type RecentEquipmentItem,
  type RecentWorkOrderItem,
} from '@/features/teams/services/teamStatsService';
import { teamStats as teamStatsKeys } from '@/lib/queryKeys';

// ============================================
// Types
// ============================================

export interface UseTeamStatsResult {
  // Equipment stats
  equipmentStats: TeamEquipmentStats | undefined;
  isLoadingEquipmentStats: boolean;
  
  // Work order stats
  workOrderStats: TeamWorkOrderStats | undefined;
  isLoadingWorkOrderStats: boolean;
  
  // Recent equipment
  recentEquipment: RecentEquipmentItem[];
  isLoadingRecentEquipment: boolean;
  
  // Recent work orders
  recentWorkOrders: RecentWorkOrderItem[];
  isLoadingRecentWorkOrders: boolean;
  
  // Combined loading state
  isLoading: boolean;
  
  // Error states
  hasError: boolean;
}

// ============================================
// Hook
// ============================================

/**
 * Hook to fetch all team statistics in parallel using React Query
 * 
 * @param teamId - The team ID to fetch statistics for
 * @param organizationId - The organization ID
 * @returns Object containing equipment stats, work order stats, recent items, and loading states
 */
export function useTeamStats(
  teamId: string | undefined,
  organizationId: string | undefined
): UseTeamStatsResult {
  const enabled = !!teamId && !!organizationId;
  
  const results = useQueries({
    queries: [
      // Equipment stats query
      {
        queryKey: teamStatsKeys.equipment(organizationId || '', teamId || ''),
        queryFn: () => getTeamEquipmentStats(organizationId!, teamId!),
        enabled,
        staleTime: 30 * 1000, // 30 seconds
        refetchOnWindowFocus: true,
      },
      // Work order stats query
      {
        queryKey: teamStatsKeys.workOrders(organizationId || '', teamId || ''),
        queryFn: () => getTeamWorkOrderStats(organizationId!, teamId!),
        enabled,
        staleTime: 30 * 1000, // 30 seconds
        refetchOnWindowFocus: true,
      },
      // Recent equipment query
      {
        queryKey: teamStatsKeys.recentEquipment(organizationId || '', teamId || ''),
        queryFn: () => getTeamRecentEquipment(organizationId!, teamId!, 5),
        enabled,
        staleTime: 2 * 60 * 1000, // 2 minutes
      },
      // Recent work orders query
      {
        queryKey: teamStatsKeys.recentWorkOrders(organizationId || '', teamId || ''),
        queryFn: () => getTeamRecentWorkOrders(organizationId!, teamId!, 5),
        enabled,
        staleTime: 2 * 60 * 1000, // 2 minutes
      },
    ],
  });

  const [
    equipmentStatsQuery,
    workOrderStatsQuery,
    recentEquipmentQuery,
    recentWorkOrdersQuery,
  ] = results;

  return {
    // Equipment stats
    equipmentStats: equipmentStatsQuery.data,
    isLoadingEquipmentStats: equipmentStatsQuery.isLoading,
    
    // Work order stats
    workOrderStats: workOrderStatsQuery.data,
    isLoadingWorkOrderStats: workOrderStatsQuery.isLoading,
    
    // Recent equipment
    recentEquipment: recentEquipmentQuery.data || [],
    isLoadingRecentEquipment: recentEquipmentQuery.isLoading,
    
    // Recent work orders
    recentWorkOrders: recentWorkOrdersQuery.data || [],
    isLoadingRecentWorkOrders: recentWorkOrdersQuery.isLoading,
    
    // Combined loading state
    isLoading: results.some(r => r.isLoading),
    
    // Error states
    hasError: results.some(r => r.isError),
  };
}
