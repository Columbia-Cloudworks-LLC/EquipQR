import { useQuery } from '@tanstack/react-query';
import { getTeamBasedDashboardStats } from '@/features/teams/services/teamBasedDashboardService';
import { getFleetEfficiency } from '@/features/teams/services/teamFleetEfficiencyService';
import { EquipmentService } from '@/features/equipment/services/EquipmentService';
import { getTeamBasedWorkOrders } from '@/features/teams/services/teamBasedWorkOrderService';
import { UNASSIGNED_TEAM_ID } from '@/contexts/selected-team-context';
import { dashboard as dashboardKeys } from '@/lib/queryKeys/dashboard';
import { useDashboardTeamQueryContext } from '@/features/dashboard/hooks/useDashboardTeamQueryContext';

export const useTeamBasedDashboardStats = (organizationId?: string) => {
  const { userTeamIds, isManager, selectedTeamId, teamsLoading } = useDashboardTeamQueryContext();

  return useQuery({
    queryKey: organizationId
      ? dashboardKeys(organizationId, selectedTeamId).teamBasedStats(userTeamIds, isManager)
      : ['team-based-dashboard-stats', organizationId],
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
      return getTeamBasedDashboardStats(organizationId, userTeamIds, isManager, selectedTeamId);
    },
    enabled: !!organizationId && !teamsLoading,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

export const useTeamBasedEquipment = (organizationId?: string) => {
  const { userTeamIds, isManager, selectedTeamId, teamsLoading } = useDashboardTeamQueryContext();

  return useQuery({
    queryKey: organizationId
      ? dashboardKeys(organizationId, selectedTeamId).teamBasedEquipment(userTeamIds, isManager)
      : ['team-based-equipment', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }
      const result = await EquipmentService.getTeamAccessibleEquipment(
        organizationId,
        userTeamIds,
        isManager,
        selectedTeamId,
      );
      return result.success && result.data ? result.data : [];
    },
    enabled: !!organizationId && !teamsLoading,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

export const useTeamBasedRecentWorkOrders = (organizationId?: string) => {
  const { userTeamIds, isManager, selectedTeamId, teamsLoading } = useDashboardTeamQueryContext();

  return useQuery({
    queryKey: organizationId
      ? dashboardKeys(organizationId, selectedTeamId).teamBasedRecentWorkOrders(userTeamIds, isManager)
      : ['team-based-recent-work-orders', organizationId],
    queryFn: () => {
      if (!organizationId) {
        return [];
      }
      return getTeamBasedWorkOrders(organizationId, userTeamIds, isManager, {}, selectedTeamId);
    },
    enabled: !!organizationId && !teamsLoading,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

export const useTeamFleetEfficiency = (organizationId?: string) => {
  const { userTeamIds, isManager, selectedTeamId, teamsLoading } = useDashboardTeamQueryContext();

  return useQuery({
    queryKey: organizationId
      ? dashboardKeys(organizationId, selectedTeamId).teamFleetEfficiency(userTeamIds, isManager)
      : ['team-fleet-efficiency', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }
      const points = await getFleetEfficiency(organizationId, userTeamIds, isManager);
      if (selectedTeamId === UNASSIGNED_TEAM_ID) {
        return [];
      }
      if (selectedTeamId) {
        return points.filter((point) => point.teamId === selectedTeamId);
      }
      return points;
    },
    enabled: !!organizationId && !teamsLoading,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
};

// Hook for checking if user has team-based dashboard access
export const useTeamBasedDashboardAccess = () => {
  const { userTeamIds, isManager, teamsLoading } = useDashboardTeamQueryContext();

  return {
    userTeamIds,
    hasTeamAccess: userTeamIds.length > 0 || isManager,
    isManager,
    isLoading: teamsLoading,
  };
};
