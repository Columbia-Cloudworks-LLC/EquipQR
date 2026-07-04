import { useMemo } from 'react';
import { useTeamMembership } from '@/features/teams/hooks/useTeamMembership';
import { hasScopedWorkOrderExportTeamRole } from '@/features/work-orders/utils/workOrderExportAccess';

/**
 * Team IDs where the current user has requestor/viewer export scope.
 * Skipped for org admins (they use unscoped exports).
 */
export function useScopedExportTeamIds(isOrgAdmin: boolean) {
  const { teamMemberships, isLoading } = useTeamMembership();

  const teamIds = useMemo(() => {
    if (isOrgAdmin || !hasScopedWorkOrderExportTeamRole(teamMemberships)) {
      return [];
    }
    return teamMemberships
      .filter((membership) => membership.role === 'requestor' || membership.role === 'viewer')
      .map((membership) => membership.team_id);
  }, [isOrgAdmin, teamMemberships]);

  return {
    teamIds,
    isLoading: isOrgAdmin ? false : isLoading,
  };
}
