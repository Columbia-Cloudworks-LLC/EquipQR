
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AccessSnapshotProfile {
  id: string;
  name: string;
  email: string;
}

export interface AccessSnapshotOrganization {
  id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending' | 'inactive';
}

export interface AccessSnapshot {
  organizations: AccessSnapshotOrganization[];
  accessibleTeamIds: string[];
  profiles: AccessSnapshotProfile[];
}

export const useAccessSnapshot = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['access-snapshot', user?.id],
    queryFn: async (): Promise<AccessSnapshot> => {
      if (!user) {
        return {
          organizations: [],
          accessibleTeamIds: [],
          profiles: []
        };
      }

      try {
        // Fallback to direct queries since RPC doesn't exist yet
        // Using direct queries for access snapshot
        return await getFallbackAccessSnapshot(user.id);
      } catch (error) {
        console.error('Access snapshot queries failed:', error);
        return {
          organizations: [],
          accessibleTeamIds: [],
          profiles: []
        };
      }
    },
    enabled: !!user,
    retry: false, // Disable retries to prevent infinite loops
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Fallback function for when RPC is not available
async function getFallbackAccessSnapshot(userId: string): Promise<AccessSnapshot> {
  try {
    // Get organization memberships
    const { data: orgMemberships } = await supabase
      .from('organization_members')
      .select('organization_id, role, status')
      .eq('user_id', userId);

    // Get team memberships 
    const { data: teamMemberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId);

    // Get basic profile info
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('id', userId)
      .single();

    return {
      organizations: (orgMemberships || []).map(om => ({
        id: om.organization_id,
        role: om.role as 'owner' | 'admin' | 'member',
        status: om.status as 'active' | 'pending' | 'inactive'
      })),
      accessibleTeamIds: (teamMemberships || []).map(tm => tm.team_id),
      profiles: profiles ? [profiles] : []
    };
  } catch (error) {
    console.error('Fallback access snapshot failed:', error);
    return {
      organizations: [],
      accessibleTeamIds: [],
      profiles: []
    };
  }
}
