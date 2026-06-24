import { useSelectedTeam } from '@/hooks/useSelectedTeam';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';
import { useWorkOrderPermissionLevels } from '@/features/work-orders/hooks/useWorkOrderPermissionLevels';

/** Shared TopBar team scope + RBAC inputs for dashboard TanStack Query hooks. */
export function useDashboardTeamQueryContext() {
  const { getUserTeamIds, isLoading: teamsLoading } = useTeamMembership();
  const { isManager } = useWorkOrderPermissionLevels();
  const { selectedTeamId } = useSelectedTeam();
  const userTeamIds = getUserTeamIds();

  return {
    userTeamIds,
    isManager,
    selectedTeamId,
    teamsLoading,
  };
}
