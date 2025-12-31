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

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface AssignmentOption {
  id: string;
  name: string;
  type: 'user';
  email?: string;
  role?: string;
}

interface AssignmentQueryResult {
  assignees: AssignmentOption[];
  equipmentHasNoTeam: boolean;
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
        return { assignees: [], equipmentHasNoTeam: false };
      }
      
      // equipmentId is REQUIRED for assignment - if not provided, return empty
      if (!equipmentId) {
        logger.warn('[useWorkOrderAssignmentOptions] equipmentId is required for work order assignment');
        return { assignees: [], equipmentHasNoTeam: false };
      }

      // Get the equipment's team_id
      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment')
        .select('team_id')
        .eq('id', equipmentId)
        .eq('organization_id', organizationId)
        .single();

      if (equipmentError) {
        console.error('[useWorkOrderAssignmentOptions] Error fetching equipment:', equipmentError);
        throw equipmentError;
      }

      // If equipment has NO team, assignment is BLOCKED
      if (!equipment?.team_id) {
        return { assignees: [], equipmentHasNoTeam: true };
      }

      const assignees: AssignmentOption[] = [];

      // Include organization administrators (owner/admin)
      const { data: orgAdmins, error: orgAdminsError } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          role,
          profiles:user_id (
            id,
            name,
            email
          )
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .in('role', ['owner', 'admin']);

      if (orgAdminsError) {
        console.error('[useWorkOrderAssignmentOptions] Error fetching org admins:', orgAdminsError);
        throw orgAdminsError;
      }

      if (orgAdmins) {
        const adminOptions = orgAdmins.map(member => ({
          id: member.user_id,
          name: member.profiles?.name ?? 'Unknown',
          email: member.profiles?.email ?? '',
          role: member.role,
          type: 'user' as const
        }));
        assignees.push(...adminOptions);
      }

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

      // Remove duplicates based on user ID
      const uniqueAssignees = assignees.filter((assignee, index, self) =>
        index === self.findIndex(a => a.id === assignee.id)
      );

      return { 
        assignees: uniqueAssignees.sort((a, b) => a.name.localeCompare(b.name)),
        equipmentHasNoTeam: false
      };
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const queryResult = membersQuery.data || { assignees: [], equipmentHasNoTeam: false };

  return {
    assignmentOptions: queryResult.assignees,
    members: queryResult.assignees,
    isLoading: membersQuery.isLoading,
    error: membersQuery.error,
    // Flag to indicate assignment is blocked because equipment has no team
    equipmentHasNoTeam: queryResult.equipmentHasNoTeam
  };
};

/**
 * @deprecated Use useWorkOrderAssignmentOptions instead
 */
export const useWorkOrderAssignment = useWorkOrderAssignmentOptions;
