
import { useQuery } from '@tanstack/react-query';
import { getTeamBasedWorkOrders, type TeamBasedWorkOrderFilters } from '@/features/teams/services/teamBasedWorkOrderService';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useWorkOrderPermissionLevels } from '@/features/work-orders/hooks/useWorkOrderPermissionLevels';

export const useTeamBasedWorkOrders = (filters: TeamBasedWorkOrderFilters = {}) => {
  const { currentOrganization } = useOrganization();
  const { getUserTeamIds, isLoading: teamsLoading } = useTeamMembership();
  const { isManager } = useWorkOrderPermissionLevels();

  const userTeamIds = getUserTeamIds();

  return useQuery({
    queryKey: ['team-based-work-orders', currentOrganization?.id, userTeamIds, isManager, filters],
    queryFn: () => {
      if (!currentOrganization?.id) {
        return [];
      }
      return getTeamBasedWorkOrders(currentOrganization.id, userTeamIds, isManager, filters);
    },
    enabled: !!currentOrganization?.id && !teamsLoading,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
};

// Hook for checking if user has team-based access
export const useTeamBasedAccess = () => {
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
