import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import TeamRepository from '@/features/teams/services/repositories/TeamRepository';
import { 
  removeTeamMember,
  getAvailableUsersForTeam
} from '@/features/teams/services/teamService';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAccessSnapshot } from '@/hooks/useAccessSnapshot';
import { useSession } from '@/hooks/useSession';
import { useTeam as useTeamContext } from '@/features/teams/hooks/useTeam';
import { logger } from '@/utils/logger';

/**
 * Primary hook for the Teams list — repository-backed with access-snapshot filtering.
 * Replaces the legacy raw-Supabase useTeams from useTeams.ts.
 * Accepts an optional organizationId; if omitted, uses context.
 */
export const useTeams = (
  organizationId?: string | undefined,
  options: { enabled?: boolean } = {}
) => {
  const { currentOrganization } = useOrganization();
  const { teamMemberships } = useTeamContext();

  const orgId = organizationId ?? currentOrganization?.id;
  const role = currentOrganization?.userRole;
  const isElevated = role === 'owner' || role === 'admin';
  const queryEnabled = options.enabled !== false;
  const { data: accessSnapshot, isLoading: isAccessLoading } = useAccessSnapshot({
    enabled: queryEnabled && !isElevated,
  });

  const query = useQuery({
    queryKey: ['teams', orgId],
    queryFn: async () => {
      const allTeams = await TeamRepository.getTeamsByOrg(orgId!);

      if (!isElevated) {
        if (!accessSnapshot) return [];
        const accessibleIds = new Set(accessSnapshot.accessibleTeamIds);
        return allTeams.filter(t => accessibleIds.has(t.id));
      }

      return allTeams;
    },
    enabled: queryEnabled && !!orgId && (isElevated || !isAccessLoading),
    staleTime: 1000 * 60 * 2,
  });

  const teams = query.data ?? [];
  const managedTeams = teams.filter(team =>
    teamMemberships.some(m => m.team_id === team.id && m.role === 'manager')
  );

  return {
    teams,
    managedTeams,
    isLoading: query.isLoading,
    error: query.error,
    ...query,
  };
};

// Hook for managing a single team
export const useTeam = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: () => TeamRepository.getTeamById(teamId!),
    enabled: !!teamId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

// Hook for team mutations
export const useTeamMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { refreshSession } = useSession();

  const createTeamWithCreatorMutation = useMutation({
    mutationFn: ({ teamData, creatorId }: { teamData: Parameters<typeof TeamRepository.createTeamWithCreator>[0]; creatorId: string }) =>
      TeamRepository.createTeamWithCreator(teamData, creatorId),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams', variables.teamData.organization_id] });
      // Force-refresh the session so the new team membership (creator becomes
      // manager) shows up in TopBar/ContextBreadcrumb without requiring
      // logout/login. Guard the refresh: a transient session-refresh error
      // would otherwise reject onSuccess and flip the (already-successful)
      // team-create mutation into onError, surfacing a misleading toast even
      // though the team was created and persisted.
      //
      // logger.error (not logger.warn) is deliberate: logger.warn is gated on
      // import.meta.env.DEV in src/utils/logger.ts and is a no-op in
      // production, which would silently swallow this failure. logger.error
      // runs unconditionally so production telemetry / Better Stack capture
      // it, while still NOT flipping the mutation into onError or surfacing
      // a destructive toast (the team was created successfully; the only
      // user-visible degradation is a stale TopBar until next reload).
      try {
        await refreshSession(true);
      } catch (refreshError) {
        logger.error('Team created but session refresh failed; UI may need a manual reload to reflect new membership', refreshError);
      }
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create team",
        variant: "destructive"
      });
    }
  });

  const deleteTeamMutation = useMutation({
    mutationFn: TeamRepository.deleteTeam,
    onSuccess: (_, teamId) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.removeQueries({ queryKey: ['team', teamId] });
      toast({
        title: "Success",
        description: "Team deleted successfully",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete team",
        variant: "destructive"
      });
    }
  });

  return {
    createTeamWithCreator: createTeamWithCreatorMutation,
    deleteTeam: deleteTeamMutation,
  };
};

// Hook for team member management
export const useTeamMembers = (teamId: string | undefined, organizationId: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query for available users
  const availableUsers = useQuery({
    queryKey: ['availableUsers', organizationId, teamId],
    queryFn: () => getAvailableUsersForTeam(organizationId!, teamId!),
    enabled: !!organizationId && !!teamId,
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: ({ teamId, userId, role }: { teamId: string; userId: string; role: 'manager' | 'technician' | 'requestor' | 'viewer' }) =>
      TeamRepository.addMember(teamId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['availableUsers', organizationId, teamId] });
      toast({
        title: "Success",
        description: "Team member added successfully",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add team member",
        variant: "destructive"
      });
    }
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) => 
      removeTeamMember(teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['availableUsers', organizationId, teamId] });
      toast({
        title: "Success",
        description: "Team member removed successfully",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove team member",
        variant: "destructive"
      });
    }
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ teamId, userId, role }: { 
      teamId: string; 
      userId: string; 
      role: 'manager' | 'technician' | 'requestor' | 'viewer'
    }) => TeamRepository.updateMemberRole(teamId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams', organizationId] });
      toast({
        title: "Success",
        description: "Team member role updated successfully",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update team member role",
        variant: "destructive"
      });
    }
  });

  return {
    availableUsers,
    addMember: addMemberMutation,
    removeMember: removeMemberMutation,
    updateRole: updateRoleMutation,
  };
};

// Hook to check if user can manage team
export const useTeamManagerCheck = (userId: string | undefined, teamId: string | undefined) => {
  return useQuery({
    queryKey: ['teamManager', userId, teamId],
    queryFn: () => TeamRepository.isTeamManager(userId!, teamId!),
    enabled: !!userId && !!teamId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};