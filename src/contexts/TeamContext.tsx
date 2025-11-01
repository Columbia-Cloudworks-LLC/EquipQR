
import React from 'react';
import { useSession } from '@/hooks/useSession';
import {
  TeamContext,
  type TeamMembership,
  type TeamMembershipContextType,
} from './team-context';

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const teamData: TeamMembershipContextType = {
    teamMemberships,
    isLoading,
    error,
    refetch: refreshSession,
    hasTeamRole,
    hasTeamAccess,
    canManageTeam,
    getUserTeamIds
  };

  return (
    <TeamContext.Provider value={teamData}>
      {children}
    </TeamContext.Provider>
  );
};

export { TeamContext };
export type { TeamMembership, TeamMembershipContextType };
