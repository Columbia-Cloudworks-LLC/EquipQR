import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getWorkspaceOnboardingState } from '@/services/google-workspace';

export const useWorkspaceOnboardingState = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['workspace-onboarding', user?.id],
    queryFn: () => getWorkspaceOnboardingState(user!.id),
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });
};

