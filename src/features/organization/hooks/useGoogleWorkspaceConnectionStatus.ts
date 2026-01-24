/**
 * Hook to check Google Workspace connection status for the current organization
 */

import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getGoogleWorkspaceConnectionStatus, type WorkspaceConnectionStatus } from '@/services/google-workspace';

interface UseGoogleWorkspaceConnectionStatusResult {
  isConnected: boolean;
  domain: string | null;
  connectionStatus: WorkspaceConnectionStatus | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Checks if the current organization has Google Workspace connected.
 * Returns connection status including domain info.
 */
export const useGoogleWorkspaceConnectionStatus = (): UseGoogleWorkspaceConnectionStatusResult => {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['google-workspace', 'connection', organizationId],
    queryFn: () => getGoogleWorkspaceConnectionStatus(organizationId!),
    enabled: !!organizationId,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    isConnected: data?.is_connected ?? false,
    domain: data?.domain ?? null,
    connectionStatus: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};
