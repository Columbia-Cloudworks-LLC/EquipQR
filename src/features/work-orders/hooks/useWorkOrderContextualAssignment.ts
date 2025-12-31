/**
 * Work Order Contextual Assignment Hook
 * 
 * Used for quick assignment from work order list/details.
 * 
 * Assignment Rules:
 * - If equipment has a team: team members (manager/technician) + org admins/owners
 * - If equipment has NO team: assignment is BLOCKED (empty list returned)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AssignmentOption {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

interface ContextualAssignmentResult {
  assignees: AssignmentOption[];
  equipmentHasNoTeam: boolean;
}

export interface AssignmentWorkOrderContext {
  id: string;
  organization_id?: string;
  organizationId?: string;
  equipment_id?: string;
  equipmentId?: string;
  equipmentTeamId?: string | null;
}

export function useWorkOrderContextualAssignment(workOrder?: AssignmentWorkOrderContext) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['workOrderContextualAssignment', workOrder?.id, workOrder?.equipment_id || workOrder?.equipmentId],
    queryFn: async (): Promise<ContextualAssignmentResult> => {
      // Handle both snake_case and camelCase field names
      const equipmentId = workOrder?.equipment_id || workOrder?.equipmentId;
      const organizationId = workOrder?.organization_id || workOrder?.organizationId;
      const equipmentTeamId = workOrder?.equipmentTeamId;

      if (!equipmentId || !organizationId) {
        return { assignees: [], equipmentHasNoTeam: false };
      }

      // Determine the team ID - either from enhanced work order or by fetching equipment
      let teamId = equipmentTeamId;
      
      if (!teamId) {
        // Fetch equipment to get team_id
        // Filter by organization_id as a multi-tenancy failsafe (per coding guidelines)
        const { data: equipment, error: equipmentError } = await supabase
          .from('equipment')
          .select('team_id')
          .eq('id', equipmentId)
          .eq('organization_id', organizationId)
          .single();

        if (equipmentError) {
          console.error('Error fetching equipment:', equipmentError);
          throw equipmentError;
        }

        teamId = equipment?.team_id;
      }

      // If equipment has NO team, assignment is BLOCKED
      if (!teamId) {
        return { assignees: [], equipmentHasNoTeam: true };
      }

      const assignees: AssignmentOption[] = [];

      // Get org admins/owners
      const { data: orgAdmins, error: orgAdminsError } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          role,
          profiles!inner(
            id,
            name,
            email
          )
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .in('role', ['owner', 'admin']);

      if (orgAdminsError) {
        console.error('Error fetching org admins:', orgAdminsError);
        throw orgAdminsError;
      }

      if (orgAdmins) {
        assignees.push(...orgAdmins.map(member => ({
          id: member.user_id,
          name: member.profiles.name,
          email: member.profiles.email,
          role: member.role
        })));
      }

      // Get team members (manager/technician)
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select(`
          user_id,
          role,
          profiles!inner(
            id,
            name,
            email
          )
        `)
        .eq('team_id', teamId)
        .in('role', ['manager', 'technician']);

      if (teamError) {
        console.error('Error fetching team members:', teamError);
        throw teamError;
      }

      if (teamMembers) {
        assignees.push(...teamMembers.map(member => ({
          id: member.user_id,
          name: member.profiles.name,
          email: member.profiles.email,
          role: member.role
        })));
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
    enabled: !!(workOrder?.equipment_id || workOrder?.equipmentId) && !!(workOrder?.organization_id || workOrder?.organizationId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const result = data || { assignees: [], equipmentHasNoTeam: false };

  return {
    assignmentOptions: result.assignees,
    isLoading,
    error,
    // Flag to indicate assignment is blocked because equipment has no team
    equipmentHasNoTeam: result.equipmentHasNoTeam
  };
}

