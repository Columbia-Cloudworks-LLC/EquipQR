/**
 * Organization Members Hooks - Canonical hooks for organization members
 * 
 * These hooks use optimized queries with proper caching strategies.
 * Import from here instead of using separate enhanced/optimized hooks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMemo } from 'react';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/utils/logger';
import type { OrganizationMember } from '@/features/organization/types/organization';

// Re-export the canonical type for backward compatibility
export type RealOrganizationMember = OrganizationMember;

type OrganizationMemberRow = Database['public']['Tables']['organization_members']['Row'];
type ProfileRow = Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'name' | 'email'>;

type OrganizationMemberRecord = OrganizationMemberRow & {
  profiles: ProfileRow | null;
};

/**
 * Hook for fetching organization members with optimized query
 */
export const useOrganizationMembersQuery = (organizationId: string) => {
  return useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: async (): Promise<OrganizationMember[]> => {
      if (!organizationId) return [];

      // Single optimized query with join instead of separate calls
      const { data, error } = await supabase
        .from('organization_members')
        .select<OrganizationMemberRecord>(`
          id,
          role,
          status,
          joined_date,
          user_id,
          profiles:user_id!inner (
            id,
            name,
            email
          )
        `)
        .eq('organization_id', organizationId)
        .order('joined_date', { ascending: false });

      if (error) {
        logger.error('Error fetching organization members', error);
        throw error;
      }

      return (data || []).map((member) => ({
        id: member.user_id,
        name: member.profiles?.name ?? 'Unknown',
        email: member.profiles?.email ?? '',
        role: member.role as 'owner' | 'admin' | 'member',
        status: member.status as 'active' | 'pending' | 'inactive',
        joinedDate: member.joined_date,
        avatar: undefined
      }));
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // Increased to 5 minutes for better caching
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
};

/**
 * @deprecated Use useOrganizationMembersQuery instead
 */
export const useOrganizationMembers = useOrganizationMembersQuery;

/**
 * Hook for computed organization member statistics
 */
export const useOrganizationMemberStats = (organizationId: string) => {
  const { data: members = [] } = useOrganizationMembersQuery(organizationId);
  
  return useMemo(() => {
    const activeMembers = members.filter(m => m.status === 'active');
    const pendingMembers = members.filter(m => m.status === 'pending');
    const adminCount = members.filter(m => m.role === 'admin' || m.role === 'owner').length;
    
    return {
      totalMembers: members.length,
      activeMembers: activeMembers.length,
      pendingMembers: pendingMembers.length,
      adminCount,
      members
    };
  }, [members]);
};

// Optimized mutation with optimistic updates
interface UpdateMemberRoleVariables {
  memberId: string;
  newRole: 'admin' | 'member';
}

interface MutateContext {
  previousMembers?: OrganizationMember[];
}

/**
 * Hook for updating member roles
 */
export const useUpdateMemberRole = (organizationId: string) => {
  const queryClient = useQueryClient();

  return useMutation<OrganizationMemberRow, Error, UpdateMemberRoleVariables, MutateContext>({
    mutationFn: async ({ memberId, newRole }) => {
      const { data, error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('user_id', memberId) // Use user_id instead of id for consistency
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ memberId, newRole }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['organization-members', organizationId] });
      
      const previousMembers = queryClient.getQueryData<OrganizationMember[]>(['organization-members', organizationId]);
      
      queryClient.setQueryData(['organization-members', organizationId], (old: OrganizationMember[] | undefined) => {
        if (!old) return old;
        return old.map(member => 
          member.id === memberId ? { ...member, role: newRole } : member
        );
      });
      
      return { previousMembers };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousMembers) {
        queryClient.setQueryData(['organization-members', organizationId], context.previousMembers);
      }
      logger.error('Error updating member role', error);
      toast.error('Failed to update member role');
    },
    onSuccess: () => {
      toast.success('Member role updated successfully');
    }
  });
};

interface RemovalResult {
  success: boolean;
  error?: string;
  removed_user_name?: string;
  removed_user_role?: string;
  teams_transferred?: number;
  new_manager_id?: string;
}

/**
 * Hook for removing organization members
 */
export const useRemoveMember = (organizationId: string) => {
  const queryClient = useQueryClient();

  return useMutation<RemovalResult, Error, string, MutateContext>({
    mutationFn: async (memberId) => {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc<RemovalResult>('remove_organization_member_safely', {
        user_uuid: memberId,
        org_id: organizationId,
        removed_by: currentUser.user.id
      });

      if (error) throw error;

      const result = data;

      // The function returns a JSON object with success status and details
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to remove member');
      }

      return result;
    },
    onMutate: async (memberId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['organization-members', organizationId] });
      
      const previousMembers = queryClient.getQueryData<OrganizationMember[]>(['organization-members', organizationId]);
      
      queryClient.setQueryData(['organization-members', organizationId], (old: OrganizationMember[] | undefined) => {
        if (!old) return old;
        return old.filter(member => member.id !== memberId);
      });
      
      return { previousMembers };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousMembers) {
        queryClient.setQueryData(['organization-members', organizationId], context.previousMembers);
      }
      logger.error('Error removing member', error);
      const message = error instanceof Error ? error.message : 'Failed to remove member';
      toast.error(message);
    },
    onSuccess: (data) => {
      // Show detailed success message based on what happened
      let message = `${data.removed_user_name} was removed successfully`;
      if (data.teams_transferred && data.teams_transferred > 0) {
        message += `. Team management for ${data.teams_transferred} team(s) was transferred to the organization owner.`;
      }
      
      toast.success(message);
    }
  });
};
