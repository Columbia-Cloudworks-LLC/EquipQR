/**
 * Work Order Assignment Hook - Canonical hook for work order assignment
 * 
 * This is the primary hook for fetching assignable members for work orders.
 * It provides a list of organization members who can be assigned work orders.
 * 
 * When equipmentId is provided, filters assignees to:
 * - Team members (manager or technician role) of the equipment's team
 * - Organization administrators (owner/admin roles)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AssignmentOption {
  id: string;
  name: string;
  type: 'user';
  email?: string;
  role?: string;
}

/**
 * Hook for fetching work order assignment options
 * @param organizationId - The organization ID
 * @param equipmentId - Optional equipment ID to filter assignees by team
 * @returns List of assignable members filtered by equipment team (if provided)
 */
export const useWorkOrderAssignmentOptions = (organizationId?: string, equipmentId?: string) => {
  const membersQuery = useQuery({
    queryKey: ['work-order-assignment-members', organizationId, equipmentId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useWorkOrderAssignmentOptions] No organizationId provided');
        return [];
      }
      
      // If equipmentId is provided, filter by equipment team
      if (equipmentId) {
        // First, get the equipment's team_id
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

        const assignees: AssignmentOption[] = [];

        // Always include organization administrators (owner/admin)
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

        // If equipment has a team, get team members with manager or technician role
        if (equipment?.team_id) {
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
        }

        // Remove duplicates based on user ID
        const uniqueAssignees = assignees.filter((assignee, index, self) =>
          index === self.findIndex(a => a.id === assignee.id)
        );

        return uniqueAssignees.sort((a, b) => a.name.localeCompare(b.name));
      }

      // If no equipmentId, return all organization members (backward compatibility)
      // This should not be used for new work orders, but kept for existing code
      console.log('[useWorkOrderAssignmentOptions] Fetching all members for org:', organizationId);
      
      const { data, error } = await supabase
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
        .in('role', ['owner', 'admin', 'member']);

      if (error) {
        console.error('[useWorkOrderAssignmentOptions] Query error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          error
        });
        throw error;
      }
      
      const mapped = (data || []).map(member => ({
        id: member.user_id,
        name: member.profiles?.name ?? 'Unknown',
        email: member.profiles?.email ?? '',
        role: member.role,
        type: 'user' as const
      }));
      
      return mapped.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const assignmentOptions: AssignmentOption[] = membersQuery.data || [];

  return {
    assignmentOptions,
    members: membersQuery.data || [],
    isLoading: membersQuery.isLoading,
    error: membersQuery.error
  };
};

/**
 * @deprecated Use useWorkOrderAssignmentOptions instead
 */
export const useWorkOrderAssignment = useWorkOrderAssignmentOptions;
