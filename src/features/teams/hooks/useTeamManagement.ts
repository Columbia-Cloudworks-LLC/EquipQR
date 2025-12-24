import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import TeamRepository from '@/features/teams/services/repositories/TeamRepository';
import { 
  removeTeamMember,
  getAvailableUsersForTeam
} from '@/features/teams/services/teamService';

// Hook for managing teams in an organization
export const useTeams = (organizationId: string | undefined) => {
  return useQuery({
    queryKey: ['teams', organizationId],
    queryFn: () => TeamRepository.getTeamsByOrg(organizationId!),
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
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

  const createTeamWithCreatorMutation = useMutation({
    mutationFn: ({ teamData, creatorId }: { teamData: Parameters<typeof TeamRepository.createTeamWithCreator>[0]; creatorId: string }) =>
      TeamRepository.createTeamWithCreator(teamData, creatorId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams', variables.teamData.organization_id] });
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