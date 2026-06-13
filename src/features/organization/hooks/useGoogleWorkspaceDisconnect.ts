import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { disconnectGoogleWorkspace } from '@/services/google-workspace';
import { googleWorkspace } from '@/lib/queryKeys';
import { useAppToast } from '@/hooks/useAppToast';

export function useGoogleWorkspaceDisconnect(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useAppToast();

  return useMutation({
    mutationFn: async () => {
      if (!organizationId) {
        throw new Error('Organization is required to disconnect Google Workspace.');
      }
      return disconnectGoogleWorkspace(organizationId);
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: googleWorkspace.root }),
        queryClient.invalidateQueries({ queryKey: googleWorkspace.onboardingRoot }),
      ]);

      toast({
        title: 'Google Workspace disconnected',
        description: result.domain
          ? `Disconnected from ${result.domain}. You can connect again from Workspace onboarding.`
          : 'Google Workspace has been disconnected. You can connect again from Workspace onboarding.',
      });

      navigate('/dashboard/onboarding/workspace');
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to disconnect',
        description: error.message || 'Please try again.',
        variant: 'error',
      });
    },
  });
}
