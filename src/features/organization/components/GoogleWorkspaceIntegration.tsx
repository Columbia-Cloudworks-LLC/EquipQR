import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link2, RefreshCw, Users, Loader2, Unlink, ShieldAlert } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppToast } from '@/hooks/useAppToast';
import {
  getGoogleWorkspaceConnectionStatus,
  syncGoogleWorkspaceUsers,
} from '@/services/google-workspace';
import {
  canSyncGoogleWorkspaceDirectory,
  evaluateGoogleWorkspaceConnectionHealth,
  isGoogleWorkspaceConfigured,
} from '@/services/google-workspace/auth';
import { googleWorkspace } from '@/lib/queryKeys';
import { ORGANIZATION_INTEGRATIONS_PATH } from '@/features/organization/constants/routes';
import { IntegrationLoadingCard } from '@/features/organization/components/IntegrationLoadingCard';
import { IntegrationNotConfiguredCard } from '@/features/organization/components/IntegrationNotConfiguredCard';
import {
  IntegrationCardHeader,
  IntegrationCardLayout,
  integrationActionButtonClassName,
} from '@/features/organization/components/IntegrationCardLayout';
import { GoogleWorkspaceDisconnectDialog } from '@/features/organization/components/GoogleWorkspaceDisconnectDialog';
import { useGoogleWorkspaceConnect } from '@/features/organization/hooks/useGoogleWorkspaceConnect';
import { useGoogleWorkspaceDisconnect } from '@/features/organization/hooks/useGoogleWorkspaceDisconnect';
import { canManageGoogleWorkspaceIntegration } from '@/features/organization/utils/googleWorkspaceManageAccess';

interface GoogleWorkspaceIntegrationProps {
  currentUserRole: 'owner' | 'admin' | 'member';
}

export const GoogleWorkspaceIntegration = ({ currentUserRole }: GoogleWorkspaceIntegrationProps) => {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useAppToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);

  const canManage = canManageGoogleWorkspaceIntegration(currentUserRole);
  const isConfigured = isGoogleWorkspaceConfigured();
  const organizationId = currentOrganization?.id;

  const { connect, isConnecting } = useGoogleWorkspaceConnect({
    organizationId,
    redirectUrl: ORGANIZATION_INTEGRATIONS_PATH,
  });

  const disconnectMutation = useGoogleWorkspaceDisconnect(organizationId);

  const { data: connectionStatus, isLoading } = useQuery({
    queryKey: googleWorkspace.connection(organizationId ?? ''),
    queryFn: () => getGoogleWorkspaceConnectionStatus(organizationId!),
    enabled: !!organizationId && canManage,
    staleTime: 60 * 1000,
  });

  const connectionHealth = evaluateGoogleWorkspaceConnectionHealth(connectionStatus);
  const canSyncDirectory = canSyncGoogleWorkspaceDirectory(connectionStatus);

  const handleSync = async () => {
    if (!organizationId) return;
    setIsSyncing(true);
    try {
      const result = await syncGoogleWorkspaceUsers(organizationId);
      const revocationSummary =
        result.membersDeactivated > 0 || result.claimsRevoked > 0
          ? ` Revoked access for ${result.membersDeactivated} member(s).`
          : '';
      toast({
        title: 'Directory synced',
        description: `${result.usersSynced} users loaded.${revocationSummary}`,
      });
      await queryClient.invalidateQueries({ queryKey: googleWorkspace.root });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      const isTokenError = /revoked|expired|token|not connected|401|403/i.test(message);
      toast({
        title: 'Failed to sync users',
        description: isTokenError
          ? 'Google Workspace authorization is no longer valid. Disconnect and connect again from this page.'
          : message,
        variant: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfirmDisconnect = () => {
    disconnectMutation.mutate(undefined, {
      onSettled: () => {
        setDisconnectDialogOpen(false);
      },
    });
  };

  if (!canManage) {
    return null;
  }

  if (!isConfigured) {
    return (
      <IntegrationNotConfiguredCard
        title="Google Workspace"
        description="Import and manage organization members"
      />
    );
  }

  if (isLoading) {
    return <IntegrationLoadingCard label="Loading Google Workspace..." />;
  }

  const statusBadge =
    connectionHealth === 'healthy' ? (
      <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
        Connected
      </Badge>
    ) : connectionHealth === 'missing_permissions' ? (
      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
        Permissions needed
      </Badge>
    ) : (
      <Badge variant="secondary" className="text-xs">
        Not connected
      </Badge>
    );

  return (
    <>
      <IntegrationCardLayout>
        <IntegrationCardHeader
          title="Google Workspace"
          description={
            connectionHealth === 'disconnected'
              ? 'Import and manage organization members'
              : `Domain: ${connectionStatus?.domain || 'Unknown'}`
          }
          badge={statusBadge}
          actions={
            <>
              {connectionHealth === 'disconnected' && (
                <Button
                  size="sm"
                  className={integrationActionButtonClassName}
                  onClick={connect}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Connect
                </Button>
              )}

              {connectionHealth === 'healthy' && (
                <>
                  {canSyncDirectory && (
                    <Button
                      size="sm"
                      className={integrationActionButtonClassName}
                      onClick={handleSync}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Sync Directory
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className={integrationActionButtonClassName}
                    onClick={() => setDisconnectDialogOpen(true)}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Unlink className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Disconnect
                  </Button>
                  <Button variant="ghost" size="sm" className={integrationActionButtonClassName} asChild>
                    <Link to="/dashboard/organization">
                      <Users className="h-3.5 w-3.5 mr-1.5" />
                      Members
                    </Link>
                  </Button>
                </>
              )}

              {connectionHealth === 'missing_permissions' && (
                <>
                  {canSyncDirectory && (
                    <Button
                      size="sm"
                      className={integrationActionButtonClassName}
                      onClick={handleSync}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Sync Directory
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className={integrationActionButtonClassName}
                    onClick={connect}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Finish authorization
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={integrationActionButtonClassName}
                    onClick={() => setDisconnectDialogOpen(true)}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Unlink className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Disconnect
                  </Button>
                </>
              )}
            </>
          }
        />

        {connectionHealth === 'missing_permissions' && (
          <Alert>
            <AlertDescription className="text-sm">
              EquipQR still needs Google approval for directory sync and export features (Drive,
              Docs, and Sheets). Click Finish authorization to complete the same one-time consent
              flow used during onboarding.
            </AlertDescription>
          </Alert>
        )}

        {connectionHealth === 'disconnected' && (
          <p className="text-xs text-muted-foreground">
            Claimed Workspace domains require explicit import or invitation before members can
            access the organization.
          </p>
        )}
      </IntegrationCardLayout>

      <GoogleWorkspaceDisconnectDialog
        open={disconnectDialogOpen}
        onOpenChange={setDisconnectDialogOpen}
        onConfirm={handleConfirmDisconnect}
        isPending={disconnectMutation.isPending}
      />
    </>
  );
};
