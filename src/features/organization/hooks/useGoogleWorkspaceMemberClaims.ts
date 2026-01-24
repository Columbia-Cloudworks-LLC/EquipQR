/**
 * Hook to manage Google Workspace member claims
 * 
 * These are users selected from Google Workspace directory who haven't signed up yet.
 * When they sign up, they will be automatically added to the organization.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppToast } from '@/hooks/useAppToast';
import { logger } from '@/utils/logger';

export interface GoogleWorkspaceMemberClaim {
  id: string;
  organizationId: string;
  email: string;
  source: string;
  status: 'selected' | 'claimed' | 'revoked';
  createdBy: string;
  createdAt: string;
  claimedUserId?: string;
  claimedAt?: string;
  // Joined from google_workspace_directory_users
  fullName?: string;
  givenName?: string;
  familyName?: string;
}

/**
 * Fetch pending Google Workspace member claims for an organization.
 * These are users selected from GWS directory who haven't signed up yet.
 */
export const useGoogleWorkspaceMemberClaims = (organizationId: string) => {
  return useQuery({
    queryKey: ['gws-member-claims', organizationId],
    queryFn: async (): Promise<GoogleWorkspaceMemberClaim[]> => {
      if (!organizationId) return [];

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      // Fetch pending claims (status = 'selected', source = 'google_workspace')
      const { data, error } = await supabase
        .from('organization_member_claims')
        .select(`
          id,
          organization_id,
          email,
          source,
          status,
          created_by,
          created_at,
          claimed_user_id,
          claimed_at
        `)
        .eq('organization_id', organizationId)
        .eq('source', 'google_workspace')
        .eq('status', 'selected')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching GWS member claims', error);
        throw error;
      }

      if (!data || data.length === 0) return [];

      // Fetch directory user info for names
      // Normalize emails (trim + lowercase) for consistent matching
      const normalizedEmails = [...new Set(data.map(claim => claim.email.trim().toLowerCase()))];
      const { data: directoryUsers, error: directoryError } = await supabase
        .from('google_workspace_directory_users')
        .select('primary_email, full_name, given_name, family_name')
        .eq('organization_id', organizationId)
        .in('primary_email', normalizedEmails);

      if (directoryError) {
        logger.error('Error fetching Google Workspace directory users', directoryError);
        // Continue with empty names rather than failing the whole query
      }

      // Normalize emails consistently (trim + lowercase) for map keys and lookups
      const directoryMap = new Map(
        (directoryUsers || []).map(u => [u.primary_email.trim().toLowerCase(), u])
      );

      return data.map(claim => {
        const directoryUser = directoryMap.get(claim.email.trim().toLowerCase());
        return {
          id: claim.id,
          organizationId: claim.organization_id,
          email: claim.email,
          source: claim.source,
          status: claim.status as 'selected' | 'claimed' | 'revoked',
          createdBy: claim.created_by,
          createdAt: claim.created_at,
          claimedUserId: claim.claimed_user_id || undefined,
          claimedAt: claim.claimed_at || undefined,
          fullName: directoryUser?.full_name || undefined,
          givenName: directoryUser?.given_name || undefined,
          familyName: directoryUser?.family_name || undefined,
        };
      });
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Revoke a Google Workspace member claim.
 * This prevents the user from being auto-added when they sign up.
 */
export const useRevokeGoogleWorkspaceMemberClaim = (organizationId: string) => {
  const queryClient = useQueryClient();
  const appToast = useAppToast();

  return useMutation({
    mutationFn: async (claimId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('organization_member_claims')
        .update({ status: 'revoked' })
        .eq('id', claimId)
        .eq('organization_id', organizationId)
        .select('id, email, status');

      if (error) {
        logger.error('Error revoking GWS member claim', error);
        throw error;
      }

      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gws-member-claims', organizationId] });
      appToast.success({ description: 'Pending member removed' });
    },
    onError: (error) => {
      logger.error('Error revoking GWS member claim', error);
      appToast.error({ description: 'Failed to remove pending member' });
    },
  });
};
