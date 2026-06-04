import { useSession } from '@/hooks/useSession';
import type {
  TeamMembership,
  TeamMembershipContextType,
} from '@/contexts/team-context';

export type { TeamMembershipContextType };

export const useTeamMembership = (): TeamMembershipContextType => {
  const { 
    sessionData, 
    isLoading, 
    error, 
    hasTeamRole, 
    hasTeamAccess, 
    canManageTeam, 
    getUserTeamIds,
    refreshSession 
  } = useSession();

  // Convert session team memberships to the expected format
  const teamMemberships: TeamMembership[] = (sessionData?.teamMemberships || []).map(tm => ({
    team_id: tm.teamId,
    team_name: tm.teamName,
    role: tm.role,
    joined_date: tm.joinedDate
  }));

  return {
    teamMemberships,
    isLoading,
    error,
    refetch: refreshSession,
    hasTeamRole,
    hasTeamAccess,
    canManageTeam,
    getUserTeamIds
  };
};
