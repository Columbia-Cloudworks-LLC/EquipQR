import { useQuery } from '@tanstack/react-query';
import { useSimpleOrganization } from '@/hooks/useSimpleOrganization';
import { useTeamMembership } from '@/hooks/useTeamMembership';

import { getTeamFleetData, TeamFleetData } from '@/services/teamFleetService';

/**
 * Hook to get team-based fleet data with proper access control
 * Only shows teams and equipment that the user has access to
 */
export const useTeamFleetData = () => {
  const { currentOrganization } = useSimpleOrganization();
  const { getUserTeamIds, isLoading: teamsLoading } = useTeamMembership();
  
  const userTeamIds = getUserTeamIds();
  const isOrgAdmin = currentOrganization?.userRole === 'owner' || currentOrganization?.userRole === 'admin';

  return useQuery({
    queryKey: ['team-fleet-data', currentOrganization?.id, userTeamIds, isOrgAdmin],
    queryFn: async (): Promise<TeamFleetData> => {
      if (!currentOrganization?.id) {
        return {
          teams: [],
          teamEquipmentData: [],
          hasLocationData: false,
          totalEquipmentCount: 0,
          totalLocatedCount: 0
        };
      }

      return getTeamFleetData(
        currentOrganization.id,
        userTeamIds,
        isOrgAdmin
      );
    },
    enabled: !!currentOrganization?.id && !teamsLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2
  });
};
