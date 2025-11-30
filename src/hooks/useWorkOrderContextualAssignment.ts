import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();
  
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

      // Helper function to ensure current user is included
      const ensureCurrentUserIncluded = async (options: AssignmentOption[]): Promise<AssignmentOption[]> => {
        if (!user?.id) return options;
        
        // Check if current user is already in the list
        if (options.find(opt => opt.id === user.id)) {
          return options;
        }

        // Fetch current user's org membership
        const { data: currentUserMember } = await supabase
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
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (currentUserMember) {
          return [
            ...options,
            {
              id: currentUserMember.user_id,
              name: currentUserMember.profiles.name,
              email: currentUserMember.profiles.email,
              role: currentUserMember.role
            }
          ];
        }

        return options;
      };

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

        const options = teamMembers.map(member => ({
          id: member.user_id,
          name: member.profiles.name,
          email: member.profiles.email,
          role: member.role
        }));

        // Always include current user if they're an active org member, even if not in team
        return ensureCurrentUserIncluded(options);
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

          const options = teamMembers.map(member => ({
            id: member.user_id,
            name: member.profiles.name,
            email: member.profiles.email,
            role: member.role
          }));

          // Always include current user if they're an active org member, even if not in team
          return ensureCurrentUserIncluded(options);
        } else {
          // If equipment is not assigned to a team, get ALL active organization members
          // (not just owners/admins, so regular members can also be assigned)
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
            .in('role', ['owner', 'admin', 'member']); // Include 'member' role

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