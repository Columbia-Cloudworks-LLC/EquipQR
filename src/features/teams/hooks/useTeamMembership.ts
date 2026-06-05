import { useSession } from '@/hooks/useSession';
import { mapSessionTeamMemberships } from '@/features/teams/utils/sessionTeamMemberships';
import type { TeamMembershipContextType } from '@/contexts/team-context';

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

  const teamMemberships = mapSessionTeamMemberships(sessionData?.teamMemberships);

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
