
import React from 'react';
import { useSession } from '@/hooks/useSession';
import { mapSessionTeamMemberships } from '@/features/teams/utils/sessionTeamMemberships';
import {
  TeamContext,
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

  const teamMemberships = mapSessionTeamMemberships(sessionData?.teamMemberships);

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
