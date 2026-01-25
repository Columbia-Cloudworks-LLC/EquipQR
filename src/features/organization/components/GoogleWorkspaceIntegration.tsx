import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link2, RefreshCw, Users } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppToast } from '@/hooks/useAppToast';
import {
  getGoogleWorkspaceConnectionStatus,
  syncGoogleWorkspaceUsers,
} from '@/services/google-workspace';
import { generateGoogleWorkspaceAuthUrl, isGoogleWorkspaceConfigured } from '@/services/google-workspace/auth';

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
    queryKey: ['google-workspace', 'connection', currentOrganization?.id],
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
      await queryClient.invalidateQueries({ queryKey: ['google-workspace', 'directory-users', currentOrganization.id] });
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Google Workspace Integration
          </CardTitle>
          <CardDescription>
            Connect your Google Workspace to import users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Google Workspace integration is not configured. Please contact your administrator.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Google Workspace Integration
        </CardTitle>
        <CardDescription>
          Import and manage your organization members directly from Google Workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Checking connection status...
          </div>
        ) : connectionStatus?.is_connected ? (
          <>
            <div className="text-sm text-muted-foreground">
              Connected domain: {connectionStatus.domain || 'Unknown'}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSync} disabled={isSyncing}>
                {isSyncing ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync Directory
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard/organization">
                  View Members
                </Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Admin access is granted after users sign in with Google Workspace.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Connect your Workspace to import users and assign organization members.
            </p>
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Connect Google Workspace
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleWorkspaceIntegration;

