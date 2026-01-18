import { useQuery } from '@tanstack/react-query';
import { getTeamBasedDashboardStats } from '@/features/teams/services/teamBasedDashboardService';
import { getFleetEfficiency } from '@/features/teams/services/teamFleetEfficiencyService';
import { EquipmentService } from '@/features/equipment/services/EquipmentService';
import { getTeamBasedWorkOrders } from '@/features/teams/services/teamBasedWorkOrderService';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';
import { useWorkOrderPermissionLevels } from '@/features/work-orders/hooks/useWorkOrderPermissionLevels';

export const useTeamBasedDashboardStats = (organizationId?: string) => {
  const { getUserTeamIds, isLoading: teamsLoading } = useTeamMembership();
  const { isManager } = useWorkOrderPermissionLevels();
  const userTeamIds = getUserTeamIds();

  return useQuery({
    queryKey: ['team-based-dashboard-stats', organizationId, userTeamIds, isManager],
    queryFn: () => {
      if (!organizationId) {
        return {
          totalEquipment: 0,
          activeEquipment: 0,
          maintenanceEquipment: 0,
          inactiveEquipment: 0,
          totalWorkOrders: 0,
          openWorkOrders: 0,
          overdueWorkOrders: 0,
          completedWorkOrders: 0,
          totalTeams: 0,
        };
      }
      return getTeamBasedDashboardStats(organizationId, userTeamIds, isManager);
    },
    enabled: !!organizationId && !teamsLoading,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
};

export const useTeamBasedEquipment = (organizationId?: string) => {
  const { getUserTeamIds, isLoading: teamsLoading } = useTeamMembership();
  const { isManager } = useWorkOrderPermissionLevels();
  const userTeamIds = getUserTeamIds();

  return useQuery({
    queryKey: ['team-based-equipment', organizationId, userTeamIds, isManager],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }
      const result = await EquipmentService.getTeamAccessibleEquipment(organizationId, userTeamIds, isManager);
      return result.success && result.data ? result.data : [];
    },
    enabled: !!organizationId && !teamsLoading,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
};

export const useTeamBasedRecentWorkOrders = (organizationId?: string) => {
  const { getUserTeamIds, isLoading: teamsLoading } = useTeamMembership();
  const { isManager } = useWorkOrderPermissionLevels();
  const userTeamIds = getUserTeamIds();

  return useQuery({
    queryKey: ['team-based-recent-work-orders', organizationId, userTeamIds, isManager],
    queryFn: () => {
      if (!organizationId) {
        return [];
      }
      return getTeamBasedWorkOrders(organizationId, userTeamIds, isManager, {});
    },
    enabled: !!organizationId && !teamsLoading,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
};

export const useTeamFleetEfficiency = (organizationId?: string) => {
  const { getUserTeamIds, isLoading: teamsLoading } = useTeamMembership();
  const { isManager } = useWorkOrderPermissionLevels();
  const userTeamIds = getUserTeamIds();

  return useQuery({
    queryKey: ['team-fleet-efficiency', organizationId, userTeamIds, isManager],
    queryFn: () => {
      if (!organizationId) {
        return [];
      }
      return getFleetEfficiency(organizationId, userTeamIds, isManager);
    },
    enabled: !!organizationId && !teamsLoading,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
};

// Hook for checking if user has team-based dashboard access
export const useTeamBasedDashboardAccess = () => {
  const { getUserTeamIds, isLoading: teamsLoading } = useTeamMembership();
  const { isManager } = useWorkOrderPermissionLevels();
  const userTeamIds = getUserTeamIds();

  return {
    userTeamIds,
    hasTeamAccess: userTeamIds.length > 0 || isManager, // Managers have access even without teams
    isManager,
    isLoading: teamsLoading
  };
};