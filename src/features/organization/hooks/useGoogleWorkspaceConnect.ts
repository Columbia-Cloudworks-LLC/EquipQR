import { useCallback, useState } from 'react';
import { generateGoogleWorkspaceAuthUrl } from '@/services/google-workspace/auth';
import { useAppToast } from '@/hooks/useAppToast';

interface UseGoogleWorkspaceConnectOptions {
  organizationId: string | undefined;
  redirectUrl: string;
}

export function useGoogleWorkspaceConnect({
  organizationId,
  redirectUrl,
}: UseGoogleWorkspaceConnectOptions) {
  const { toast } = useAppToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (!organizationId) {
      return;
    }

    setIsConnecting(true);
    try {
      const authUrl = await generateGoogleWorkspaceAuthUrl({
        organizationId,
        redirectUrl,
      });
      window.location.href = authUrl;
    } catch (error) {
      toast({
        title: 'Failed to connect Google Workspace',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
      setIsConnecting(false);
    }
  }, [organizationId, redirectUrl, toast]);

  return { connect, isConnecting };
}
