import { useMemo } from 'react';
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
import { team, teams } from '@/lib/queryKeys';
import { logger } from '@/utils/logger';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { OfflineAwareWorkOrderService } from '@/services/offlineAwareService';
import type { OfflineQueueItem, OfflineQueueTeamCreateItem } from '@/services/offlineQueueService';
import { downloadTeamsForOffline } from '@/features/offline-queue/services/offlineWorkDataDownload';
import { offlineSavedKeys, useOfflineSavedList } from '@/features/offline-queue/utils/offlineSavedData';
import type { TeamInsert, TeamWithMembers } from '@/features/teams/types/team';

/** A team that exists only in the offline queue until it syncs. */
export type PendingSyncTeam = TeamWithMembers & { _isPendingSync?: boolean };

/** The team a queued `team_create` will produce, with its creator as manager. */
export function buildQueuedTeam(
  team: TeamInsert & { id: string },
  creatorId: string,
  queuedAt: number,
  creator?: { name?: string | null; email?: string | null },
): PendingSyncTeam {
  const timestamp = new Date(queuedAt).toISOString();
  return {
    id: team.id,
    organization_id: team.organization_id,
    name: team.name,
    description: team.description ?? null,
    created_at: timestamp,
    updated_at: timestamp,
    customer_id: team.customer_id ?? null,
    image_url: team.image_url ?? null,
    location_address: team.location_address ?? null,
    location_city: team.location_city ?? null,
    location_state: team.location_state ?? null,
    location_country: team.location_country ?? null,
    location_lat: team.location_lat ?? null,
    location_lng: team.location_lng ?? null,
    override_equipment_location: team.override_equipment_location ?? false,
    preferred_view: team.preferred_view ?? 'internal',
    team_lead_id: team.team_lead_id ?? null,
    members: [
      {
        id: `offline-member-${team.id}`,
        team_id: team.id,
        user_id: creatorId,
        role: 'manager',
        joined_date: timestamp,
        profiles: { name: creator?.name || 'You', email: creator?.email || '' },
      },
    ],
    member_count: 1,
    _isPendingSync: true,
  };
}

function isQueuedTeamCreate(item: OfflineQueueItem): item is OfflineQueueTeamCreateItem {
  return item.type === 'team_create' && (item.status === 'pending' || item.status === 'processing');
}

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
      // Strict: a failed request is an error, not a cached "no teams".
      const allTeams = await TeamRepository.getTeamsByOrgStrict(orgId!);

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

  // With no connection, fall back to the copy the background download saved,
  // and add teams created offline that are still waiting to sync.
  const offlineCtx = useOfflineQueueOptional();
  const { user } = useAuth();
  const savedTeams = useOfflineSavedList<TeamWithMembers>(
    orgId ? offlineSavedKeys.teamList(orgId) : undefined,
  );
  const queuedItems = offlineCtx?.queuedItems;
  const creatorName: string | undefined = user?.user_metadata?.full_name ?? undefined;
  const creatorEmail = user?.email;

  const teams = useMemo<PendingSyncTeam[]>(() => {
    // With no connection the saved copy is the source: the request cannot
    // succeed, and what is cached may be older than the saved copy.
    let base: PendingSyncTeam[] = query.data ?? [];
    if (savedTeams) {
      base = isElevated
        ? savedTeams.rows
        : savedTeams.rows.filter(saved => teamMemberships.some(m => m.team_id === saved.id));
    }
    const pending = (queuedItems ?? [])
      .filter(isQueuedTeamCreate)
      .filter(item => item.organizationId === orgId && !base.some(t => t.id === item.payload.team.id))
      .map(item =>
        buildQueuedTeam(item.payload.team, item.payload.creatorId, item.timestamp, {
          name: creatorName,
          email: creatorEmail,
        }),
      );
    return pending.length > 0 ? [...base, ...pending] : base;
  }, [query.data, savedTeams, isElevated, teamMemberships, queuedItems, orgId, creatorName, creatorEmail]);

  const managedTeams = teams.filter(team =>
    teamMemberships.some(m => m.team_id === team.id && m.role === 'manager')
  );

  return {
    ...query,
    data: teams,
    teams,
    managedTeams,
    // The saved copy is already on screen; do not hold it behind a request
    // that cannot finish without a connection.
    isLoading: savedTeams ? false : query.isLoading,
  };
};

// Hook for managing a single team (scoped to the current organization)
export const useTeamById = (teamId: string | undefined) => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const query = useQuery({
    queryKey: team(teamId ?? '').byOrg(orgId ?? ''),
    queryFn: () => TeamRepository.getTeamById(teamId!, orgId!),
    enabled: !!teamId && !!orgId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // A team that was never opened before, or was created offline, is not in
  // this query's cache. Show it from the team list instead.
  const { teams: listedTeams } = useTeams(orgId, { enabled: !!teamId && !query.data });
  const listedTeam = query.data ? undefined : listedTeams.find(candidate => candidate.id === teamId);
  if (!listedTeam) return query;
  return { ...query, data: listedTeam, isLoading: false, isPending: false, isError: false, error: null };
};

/**
 * After a team change that reached the server, save a fresh copy of the teams
 * so pickers and the assignee list are right the next time the signal drops.
 */
function useRefreshSavedTeams(): (organizationId: string | undefined) => void {
  const queryClient = useQueryClient();
  return (organizationId) => {
    if (organizationId) void downloadTeamsForOffline(queryClient, organizationId);
  };
}

// Hook for team mutations
export const useTeamMutations = () => {
  const queryClient = useQueryClient();
  const refreshSavedTeams = useRefreshSavedTeams();
  const { toast } = useToast();
  const { refreshSession } = useSession();

  const offlineCtx = useOfflineQueueOptional();

  const createTeamWithCreatorMutation = useMutation({
    mutationFn: async ({ teamData, creatorId }: { teamData: Parameters<typeof TeamRepository.createTeamWithCreator>[0]; creatorId: string }): Promise<PendingSyncTeam> => {
      // The id is chosen here so a team created offline can be picked for
      // equipment before it has synced.
      const team = { ...teamData, id: teamData.id ?? crypto.randomUUID() };
      const service = new OfflineAwareWorkOrderService(team.organization_id, creatorId);
      const result = await service.createTeam(team, creatorId);
      if (result.queuedOffline || !result.data) {
        offlineCtx?.refresh();
        return buildQueuedTeam(team, creatorId, Date.now());
      }
      return result.data;
    },
    onSuccess: async (created, variables) => {
      // Nothing reached the server yet: there is no list to reload and no
      // new membership for the session to pick up.
      if (created._isPendingSync) return;
      queryClient.invalidateQueries({ queryKey: teams(variables.teamData.organization_id).root });
      refreshSavedTeams(variables.teamData.organization_id);
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
    mutationFn: ({ teamId, organizationId }: { teamId: string; organizationId: string }) =>
      TeamRepository.deleteTeam(teamId, organizationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: teams(variables.organizationId).root });
      queryClient.removeQueries({ queryKey: team(variables.teamId).byOrg(variables.organizationId) });
      refreshSavedTeams(variables.organizationId);
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
  const refreshSavedTeams = useRefreshSavedTeams();
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
      refreshSavedTeams(organizationId);
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
      refreshSavedTeams(organizationId);
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