import { useSelectedTeam } from '@/hooks/useSelectedTeam';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';
import { useOrganization } from '@/contexts/OrganizationContext';
import { isOrgAdminRole } from '@/features/teams/utils/teamAccessScope';

/** Shared TopBar team scope + RBAC inputs for dashboard TanStack Query hooks. */
export function useDashboardTeamQueryContext() {
  const { getUserTeamIds, isLoading: teamsLoading } = useTeamMembership();
  const { currentOrganization } = useOrganization();
  const { selectedTeamId } = useSelectedTeam();
  const userTeamIds = getUserTeamIds();
  const isOrgAdmin = isOrgAdminRole(currentOrganization?.userRole);

  return {
    userTeamIds,
    /** Org owner/admin only — not work-order "manager" from another org membership. */
    isManager: isOrgAdmin,
    selectedTeamId,
    teamsLoading,
  };
}
