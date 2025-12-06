/**
 * Work Order Assignment Hook - Canonical hook for work order assignment
 * 
 * This is the primary hook for fetching assignable members for work orders.
 * It provides a list of organization members who can be assigned work orders.
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
 * Returns a list of organization members who can be assigned work orders
 */
export const useWorkOrderAssignmentOptions = (organizationId?: string) => {
  // Direct query for organization members - all active members can be assigned
  const membersQuery = useQuery({
    queryKey: ['work-order-assignment-members', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useWorkOrderAssignmentOptions] No organizationId provided');
        return [];
      }
      
      console.log('[useWorkOrderAssignmentOptions] Fetching members for org:', organizationId);
      
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
        .in('role', ['owner', 'admin', 'member']); // All active members can be assigned work orders

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
      
      console.log('[useWorkOrderAssignmentOptions] Query result:', { 
        dataCount: data?.length || 0, 
        data: data?.slice(0, 2) // Log first 2 for debugging
      });
      
      const mapped = (data || []).map(member => ({
        id: member.user_id,
        name: member.profiles?.name ?? 'Unknown',
        email: member.profiles?.email ?? '',
        role: member.role,
        type: 'user' as const
      }));
      
      console.log('[useWorkOrderAssignmentOptions] Mapped result:', {
        mappedCount: mapped.length,
        mapped: mapped.slice(0, 2)
      });
      
      // Sort by name after mapping
      return mapped.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Combine data into assignment options (only users now)
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
