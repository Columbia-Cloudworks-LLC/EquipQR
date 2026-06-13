import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { googleWorkspace } from '@/lib/queryKeys';
import { getGoogleWorkspaceOAuthErrorMessage } from '@/utils/google-workspace-oauth-errors';

/**
 * Handles QuickBooks and Google Workspace OAuth callback query params on any
 * organization admin page that can serve as the OAuth return target.
 */
export function useOrganizationIntegrationOAuthCallbacks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    const error = searchParams.get('qb_error');
    const errorDescription = searchParams.get('qb_error_description');
    const success = searchParams.get('qb_connected');

    if (error) {
      toast.error(errorDescription || 'Failed to connect QuickBooks');
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('qb_error');
      newParams.delete('qb_error_description');
      setSearchParams(newParams, { replace: true });
      return;
    }

    if (success) {
      toast.success('QuickBooks connected successfully!');
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'connection'] });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('qb_connected');
      newParams.delete('realm_id');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient]);

  useEffect(() => {
    const error = searchParams.get('gw_error');
    const supportRef = searchParams.get('gw_ref');
    const success = searchParams.get('gw_connected');

    if (error) {
      toast.error(getGoogleWorkspaceOAuthErrorMessage(error, supportRef));
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('gw_error');
      newParams.delete('gw_error_description');
      newParams.delete('gw_ref');
      newParams.delete('gw_connected');
      setSearchParams(newParams, { replace: true });
      return;
    }

    if (success === 'true') {
      toast.success('Google Workspace reconnected successfully!');
      queryClient.invalidateQueries({ queryKey: googleWorkspace.root });

      const newParams = new URLSearchParams(searchParams);
      newParams.delete('gw_connected');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient]);
}
