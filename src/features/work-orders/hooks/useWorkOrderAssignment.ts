/**
 * Work Order Assignment Hook - Canonical hook for work order assignment
 * 
 * This is the primary hook for fetching assignable members for work orders.
 * 
 * Assignment Rules:
 * - If equipment has a team: team members (manager/technician) + org admins/owners
 * - If equipment has NO team: assignment is BLOCKED (empty list returned)
 * - equipmentId is REQUIRED for work order assignment
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import {
  fetchOrgAdminAssignees,
  type AssignmentOption,
} from '@/features/work-orders/services/workOrderAssigneeService';
import { useBrowserOnline } from '@/hooks/useBrowserOnline';
import { useEquipmentSummariesWithQueued } from '@/features/offline-queue/hooks/useQueuedEquipment';
import { offlineSavedKeys, useSavedCopy } from '@/features/offline-queue/utils/offlineSavedData';
import type { TeamWithMembers } from '@/features/teams/types/team';

export type { AssignmentOption };

interface AssignmentQueryResult {
  assignees: AssignmentOption[];
  equipmentHasNoTeam: boolean;
  teamName: string | null;
}

/** One entry per person, sorted by name. */
function uniqueSortedAssignees(assignees: AssignmentOption[]): AssignmentOption[] {
  return assignees
    .filter((assignee, index, self) => index === self.findIndex(a => a.id === assignee.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const ASSIGNABLE_TEAM_ROLES: ReadonlySet<string> = new Set(['manager', 'technician']);

/**
 * The same list the server builds, worked out from the copies saved on the
 * device: the equipment's team members who can do the work, plus the
 * organization's owners and admins.
 */
export function buildOfflineAssignmentOptions(
  teamId: string | null | undefined,
  teams: readonly TeamWithMembers[],
  admins: readonly AssignmentOption[],
): AssignmentQueryResult {
  if (!teamId) return { assignees: [], equipmentHasNoTeam: true, teamName: null };
  const team = teams.find(candidate => candidate.id === teamId);
  const teamOptions: AssignmentOption[] = (team?.members ?? [])
    .filter(member => ASSIGNABLE_TEAM_ROLES.has(member.role))
    .map(member => ({
      id: member.user_id,
      name: member.profiles?.name ?? 'Unknown',
      email: member.profiles?.email ?? '',
      role: member.role,
      type: 'user' as const,
    }));
  return {
    assignees: uniqueSortedAssignees([...admins, ...teamOptions]),
    equipmentHasNoTeam: false,
    teamName: team?.name ?? null,
  };
}

/**
 * Assignment options built on the device while there is no connection, or
 * `undefined` when connected, not needed, or the equipment is not saved.
 * Also covers equipment created offline, which the server has not seen.
 */
export function useOfflineAssignmentOptions(input: {
  organizationId: string | undefined;
  equipmentId: string | undefined;
  /** False once the server's answer is available. */
  needed: boolean;
  /** The equipment's team, when the caller already knows it. */
  knownTeamId?: string | null;
  /** Offer owners and admins even when the equipment has no team. */
  adminsWhenNoTeam?: boolean;
}): AssignmentQueryResult | undefined {
  const { organizationId, equipmentId, knownTeamId, adminsWhenNoTeam = false } = input;
  const isOnline = useBrowserOnline();
  const needsOffline = !isOnline && input.needed && !!organizationId && !!equipmentId;
  const equipmentSummaries = useEquipmentSummariesWithQueued(organizationId, { enabled: needsOffline });
  const savedTeams = useSavedCopy<TeamWithMembers[]>(
    needsOffline && organizationId ? offlineSavedKeys.teamList(organizationId) : undefined,
  );
  const savedAdmins = useSavedCopy<AssignmentOption[]>(
    needsOffline && organizationId ? offlineSavedKeys.orgAdmins(organizationId) : undefined,
  );

  return useMemo(() => {
    if (!needsOffline) return undefined;
    const equipment = equipmentSummaries.find(candidate => candidate.id === equipmentId);
    const teamId = knownTeamId ?? equipment?.team_id;
    if (!teamId && !equipment) return undefined;
    const result = buildOfflineAssignmentOptions(teamId, savedTeams ?? [], savedAdmins ?? []);
    return result.equipmentHasNoTeam && adminsWhenNoTeam
      ? { ...result, assignees: [...(savedAdmins ?? [])].sort((a, b) => a.name.localeCompare(b.name)) }
      : result;
  }, [needsOffline, equipmentSummaries, equipmentId, knownTeamId, savedTeams, savedAdmins, adminsWhenNoTeam]);
}

/**
 * Hook for fetching work order assignment options
 * @param organizationId - The organization ID
 * @param equipmentId - Equipment ID (REQUIRED for proper assignment filtering)
 * @returns List of assignable members filtered by equipment team, or blocked if no team
 */
export const useWorkOrderAssignmentOptions = (organizationId?: string, equipmentId?: string) => {
  const membersQuery = useQuery({
    queryKey: ['work-order-assignment-members', organizationId, equipmentId],
    queryFn: async (): Promise<AssignmentQueryResult> => {
      if (!organizationId) {
        return { assignees: [], equipmentHasNoTeam: false, teamName: null };
      }
      
      if (!equipmentId) {
        logger.warn('[useWorkOrderAssignmentOptions] equipmentId is required for work order assignment');
        return { assignees: [], equipmentHasNoTeam: false, teamName: null };
      }

      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment')
        .select('team_id, teams:team_id ( name )')
        .eq('id', equipmentId)
        .eq('organization_id', organizationId)
        .single();

      if (equipmentError) {
        console.error('[useWorkOrderAssignmentOptions] Error fetching equipment:', equipmentError);
        throw equipmentError;
      }

      if (!equipment?.team_id) {
        return { assignees: [], equipmentHasNoTeam: true, teamName: null };
      }

      const teamName = (equipment as { teams?: { name: string } | null }).teams?.name ?? null;

      const assignees: AssignmentOption[] = [];

      assignees.push(...(await fetchOrgAdminAssignees(organizationId)));

      // Get team members with manager or technician role
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select(`
          user_id,
          role,
          profiles:user_id (
            id,
            name,
            email
          )
        `)
        .eq('team_id', equipment.team_id)
        .in('role', ['manager', 'technician']);

      if (teamError) {
        console.error('[useWorkOrderAssignmentOptions] Error fetching team members:', teamError);
        throw teamError;
      }

      if (teamMembers) {
        const teamOptions = teamMembers.map(member => ({
          id: member.user_id,
          name: member.profiles?.name ?? 'Unknown',
          email: member.profiles?.email ?? '',
          role: member.role,
          type: 'user' as const
        }));
        assignees.push(...teamOptions);
      }

      return {
        assignees: uniqueSortedAssignees(assignees),
        equipmentHasNoTeam: false,
        teamName
      };
    },
    // Only run query when both organizationId and equipmentId are provided
    // equipmentId is required for proper assignment filtering
    enabled: !!organizationId && !!equipmentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // With no connection the request above cannot run. Unless this equipment's
  // list was loaded earlier, work it out from what is saved on the device.
  const offlineResult = useOfflineAssignmentOptions({
    organizationId,
    equipmentId,
    needed: !membersQuery.data,
  });

  const queryResult =
    membersQuery.data || offlineResult || { assignees: [], equipmentHasNoTeam: false, teamName: null };

  return {
    assignmentOptions: queryResult.assignees,
    members: queryResult.assignees,
    isLoading: offlineResult ? false : membersQuery.isLoading,
    error: offlineResult ? null : membersQuery.error,
    equipmentHasNoTeam: queryResult.equipmentHasNoTeam,
    teamName: queryResult.teamName
  };
};