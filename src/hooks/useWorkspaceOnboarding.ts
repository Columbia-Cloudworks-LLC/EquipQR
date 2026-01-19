import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getWorkspaceOnboardingState } from '@/services/google-workspace';

/**
 * Check if the user is a Google OAuth user based on their app_metadata.
 */
function isGoogleUser(user: { app_metadata?: Record<string, unknown> } | null): boolean {
  if (!user) return false;
  const metadata = user.app_metadata || {};
  const provider = metadata.provider as string | undefined;
  const providers = (metadata.providers as string[]) || [];
  return provider === 'google' || providers.includes('google');
}

/**
 * Hook to fetch workspace onboarding state.
 * Only makes the RPC call for Google users to avoid unnecessary database queries.
 */
export const useWorkspaceOnboardingState = () => {
  const { user } = useAuth();
  const shouldQuery = !!user?.id && isGoogleUser(user);

  return useQuery({
    queryKey: ['workspace-onboarding', user?.id],
    queryFn: () => getWorkspaceOnboardingState(user!.id),
    enabled: shouldQuery,
    staleTime: 60 * 1000,
  });
};

