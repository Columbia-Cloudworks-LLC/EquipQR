import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link2, RefreshCw, Users, Loader2 } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppToast } from '@/hooks/useAppToast';
import {
  getGoogleWorkspaceConnectionStatus,
  syncGoogleWorkspaceUsers,
} from '@/services/google-workspace';
import { generateGoogleWorkspaceAuthUrl, isGoogleWorkspaceConfigured } from '@/services/google-workspace/auth';
import { googleWorkspace } from '@/lib/queryKeys';

interface GoogleWorkspaceIntegrationProps {
  currentUserRole: 'owner' | 'admin' | 'member';
}

export const GoogleWorkspaceIntegration = ({ currentUserRole }: GoogleWorkspaceIntegrationProps) => {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useAppToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';
  const isConfigured = isGoogleWorkspaceConfigured();

  const { data: connectionStatus, isLoading } = useQuery({
    queryKey: googleWorkspace.connection(currentOrganization?.id ?? ''),
    queryFn: () => getGoogleWorkspaceConnectionStatus(currentOrganization!.id),
    enabled: !!currentOrganization?.id && canManage,
    staleTime: 60 * 1000,
  });

  const handleConnect = async () => {
    if (!currentOrganization?.id) return;
    setIsConnecting(true);
    try {
      const authUrl = await generateGoogleWorkspaceAuthUrl({
        organizationId: currentOrganization.id,
        redirectUrl: '/dashboard/organization',
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
  };

  const handleSync = async () => {
    if (!currentOrganization?.id) return;
    setIsSyncing(true);
    try {
      const result = await syncGoogleWorkspaceUsers(currentOrganization.id);
      toast({
        title: 'Directory synced',
        description: `${result.usersSynced} users loaded.`,
      });
      await queryClient.invalidateQueries({ queryKey: googleWorkspace.root });
    } catch (error) {
      toast({
        title: 'Failed to sync users',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!canManage) {
    return null;
  }

  if (!isConfigured) {
    return (
      <div className="rounded-lg border p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Google Workspace</p>
            <p className="text-xs text-muted-foreground">Import and manage organization members</p>
          </div>
          <Badge variant="secondary" className="self-start sm:self-auto">Not configured</Badge>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Google Workspace...
        </div>
      </div>
    );
  }

  const isConnected = connectionStatus?.is_connected;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Google Workspace</p>
            {isConnected ? (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Not connected</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isConnected
              ? `Domain: ${connectionStatus?.domain || 'Unknown'}`
              : 'Import and manage organization members'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isConnected ? (
            <>
              <Button size="sm" onClick={handleSync} disabled={isSyncing}>
                {isSyncing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                )}
                Sync Directory
              </Button>
              <Button variant="outline" size="sm" onClick={handleConnect} disabled={isConnecting}>
                {isConnecting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Reconnect
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard/organization">
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                  Members
                </Link>
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Link2 className="h-3.5 w-3.5 mr-1.5" />
              )}
              Connect
            </Button>
          )}
        </div>
      </div>

      {!isConnected && (
        <p className="text-xs text-muted-foreground">
          Admin access is granted after users sign in with Google Workspace.
        </p>
      )}
    </div>
  );
};

export default GoogleWorkspaceIntegration;
