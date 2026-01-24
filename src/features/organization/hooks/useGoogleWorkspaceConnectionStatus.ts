/**
 * Hook to check Google Workspace connection status for an organization
 */

import { useQuery, type QueryObserverResult, type RefetchOptions } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getGoogleWorkspaceConnectionStatus, type WorkspaceConnectionStatus } from '@/services/google-workspace';

interface UseGoogleWorkspaceConnectionStatusOptions {
  /** Organization ID to check. Falls back to current organization from context if not provided. */
  organizationId?: string;
  /** Whether to enable the query. Defaults to true when organizationId is available. */
  enabled?: boolean;
}

interface UseGoogleWorkspaceConnectionStatusResult {
  isConnected: boolean;
  domain: string | null;
  connectionStatus: WorkspaceConnectionStatus | null;
  isLoading: boolean;
  error: Error | null;
  refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<WorkspaceConnectionStatus, Error>>;
}

/**
 * Checks if an organization has Google Workspace connected.
 * Returns connection status including domain info.
 * 
 * @param options - Optional configuration for the hook
 * @param options.organizationId - Organization ID to check. Falls back to context if not provided.
 * @param options.enabled - Whether to enable the query. Use false to skip the query entirely.
 */
export const useGoogleWorkspaceConnectionStatus = (
  options?: UseGoogleWorkspaceConnectionStatusOptions
): UseGoogleWorkspaceConnectionStatusResult => {
  const { currentOrganization } = useOrganization();
  const organizationId = options?.organizationId ?? currentOrganization?.id;
  const enabledOption = options?.enabled ?? true;

  const { data, isLoading, error, refetch } = useQuery<WorkspaceConnectionStatus, Error>({
    queryKey: ['google-workspace', 'connection', organizationId],
    queryFn: () => getGoogleWorkspaceConnectionStatus(organizationId!),
    enabled: !!organizationId && enabledOption,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    isConnected: data?.is_connected ?? false,
    domain: data?.domain ?? null,
    connectionStatus: data ?? null,
    isLoading,
    error: error instanceof Error ? error : error ? new Error(String(error)) : null,
    refetch,
  };
};
