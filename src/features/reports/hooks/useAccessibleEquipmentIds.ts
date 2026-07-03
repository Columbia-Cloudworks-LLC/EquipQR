import { useQuery } from '@tanstack/react-query';
import { EquipmentService } from '@/features/equipment/services/EquipmentService';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';

export function useAccessibleEquipmentIds(
  organizationId: string | undefined,
  isOrgAdmin: boolean,
) {
  const { getUserTeamIds, isLoading: teamsLoading } = useTeamMembership();
  const userTeamIds = getUserTeamIds();

  return useQuery({
    queryKey: ['accessible-equipment-ids', organizationId, userTeamIds, isOrgAdmin],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }
      const result = await EquipmentService.getAccessibleEquipmentIds(
        organizationId,
        userTeamIds,
        isOrgAdmin,
      );
      return result.success && result.data ? result.data : [];
    },
    enabled: !!organizationId && !teamsLoading,
    staleTime: 60 * 1000,
  });
}
