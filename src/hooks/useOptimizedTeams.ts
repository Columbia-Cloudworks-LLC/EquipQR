
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccessSnapshot } from './useAccessSnapshot';
import { useSimpleOrganization } from './useSimpleOrganization';

export interface OptimizedTeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: 'manager' | 'technician' | 'requestor' | 'viewer';
  joined_date: string;
  profiles: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface OptimizedTeam {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  members: OptimizedTeamMember[];
  member_count: number;
}

export const useOptimizedTeams = () => {
  const { currentOrganization } = useSimpleOrganization();
  const { data: accessSnapshot, isLoading: isAccessLoading } = useAccessSnapshot();

  return useQuery({
    queryKey: ['optimized-teams', currentOrganization?.id],
    queryFn: async (): Promise<OptimizedTeam[]> => {
      if (!currentOrganization) {
        return [];
      }

      // Get teams for the current organization
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('name');

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        throw teamsError;
      }

      if (!teams || teams.length === 0) {
        return [];
      }

      // If we have access snapshot, filter teams based on access
      // Owners and admins can see all org teams; members only see teams they're on
      let accessibleTeams = teams;
      const role = currentOrganization?.userRole;
      const isElevated = role === 'owner' || role === 'admin';
      
      if (!isElevated && accessSnapshot && accessSnapshot.accessibleTeamIds.length > 0) {
        const accessibleTeamIds = new Set(accessSnapshot.accessibleTeamIds);
        accessibleTeams = teams.filter(team => accessibleTeamIds.has(team.id));
      }

      if (accessibleTeams.length === 0) {
        return [];
      }

      // Get team members for accessible teams
      const teamIds = accessibleTeams.map(team => team.id);
      const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select(`
          *,
          profiles!inner(id, name, email)
        `)
        .in('team_id', teamIds);

      if (membersError) {
        console.error('Error fetching team members:', membersError);
        throw membersError;
      }

      // Group members by team and enrich with profile data
      const validRoles = ['manager', 'technician', 'requestor', 'viewer'] as const;
      type ValidRole = typeof validRoles[number];

      const isValidRole = (role: string): role is ValidRole =>
        (validRoles as readonly string[]).includes(role);

      const membersByTeam = (teamMembers || []).reduce((acc, member) => {
        if (!acc[member.team_id]) {
          acc[member.team_id] = [];
        }

        const memberRole: ValidRole = isValidRole(member.role) ? member.role : 'technician';

        acc[member.team_id].push({
          ...member,
          role: memberRole,
          profiles: member.profiles ? {
            id: member.profiles.id,
            name: member.profiles.name,
            email: member.profiles.email
          } : null
        });

        return acc;
      }, {} as Record<string, OptimizedTeamMember[]>);

      // Combine teams with their members
      return accessibleTeams.map(team => ({
        ...team,
        members: membersByTeam[team.id] || [],
        member_count: (membersByTeam[team.id] || []).length
      }));
    },
    enabled: !!currentOrganization && !isAccessLoading,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
