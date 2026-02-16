import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getWorkspaceOnboardingState } from '@/services/google-workspace';
import { isGoogleUser } from '@/utils/google-workspace';

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

