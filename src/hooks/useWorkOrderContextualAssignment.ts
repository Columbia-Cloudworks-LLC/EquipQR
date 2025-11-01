import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AssignmentOption {
  id: string;
  name: string;
  email?: string;
  role?: string;
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
  const { data: assignmentOptions = [], isLoading, error } = useQuery({
    queryKey: ['workOrderContextualAssignment', workOrder?.id, workOrder?.equipment_id || workOrder?.equipmentId],
    queryFn: async (): Promise<AssignmentOption[]> => {
      // Handle both snake_case and camelCase field names
      const equipmentId = workOrder?.equipment_id || workOrder?.equipmentId;
      const organizationId = workOrder?.organization_id || workOrder?.organizationId;
      const equipmentTeamId = workOrder?.equipmentTeamId;

      if (!equipmentId || !organizationId) {
        return [];
      }

      // If we already have team information from the enhanced work order, use it
      if (equipmentTeamId) {
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
          .eq('team_id', equipmentTeamId)
          .in('role', ['manager', 'technician']);

        if (teamError) {
          console.error('Error fetching team members:', teamError);
          throw teamError;
        }

        return teamMembers.map(member => ({
          id: member.user_id,
          name: member.profiles.name,
          email: member.profiles.email,
          role: member.role
        }));
      } else {
        // First, get the equipment details to check if it has a team (fallback for older work orders)
        const { data: equipment, error: equipmentError } = await supabase
          .from('equipment')
          .select('team_id')
          .eq('id', equipmentId)
          .single();

        if (equipmentError) {
          console.error('Error fetching equipment:', equipmentError);
          throw equipmentError;
        }

        // If equipment is assigned to a team, get team members
        if (equipment.team_id) {
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
            .eq('team_id', equipment.team_id)
            .in('role', ['manager', 'technician']);

          if (teamError) {
            console.error('Error fetching team members:', teamError);
            throw teamError;
          }

          return teamMembers.map(member => ({
            id: member.user_id,
            name: member.profiles.name,
            email: member.profiles.email,
            role: member.role
          }));
        } else {
          // If equipment is not assigned to a team, get only org admins and owners
          const { data: orgMembers, error: orgError } = await supabase
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

          if (orgError) {
            console.error('Error fetching organization members:', orgError);
            throw orgError;
          }

          return orgMembers.map(member => ({
            id: member.user_id,
            name: member.profiles.name,
            email: member.profiles.email,
            role: member.role
          }));
        }
      }
    },
    enabled: !!(workOrder?.equipment_id || workOrder?.equipmentId) && !!(workOrder?.organization_id || workOrder?.organizationId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    assignmentOptions,
    isLoading,
    error,
    hasTeamAssignment: !!(workOrder?.equipment_id || workOrder?.equipmentId) && assignmentOptions.length > 0
  };
}