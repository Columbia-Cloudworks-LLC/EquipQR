/**
 * QuickBooks Integration Component
 * 
 * Allows admin/owners to connect and manage QuickBooks Online integration.
 * Shows connection status and provides connect/disconnect functionality.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Link2, 
  Unlink, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  generateQuickBooksAuthUrl, 
  isQuickBooksConfigured,
  getConnectionStatus,
  disconnectQuickBooks,
  manualTokenRefresh
} from '@/services/quickbooks';
import { isQuickBooksEnabled } from '@/lib/flags';
import { toast } from 'sonner';

interface QuickBooksIntegrationProps {
  currentUserRole: 'owner' | 'admin' | 'member';
}

export const QuickBooksIntegration = ({
  currentUserRole
}: QuickBooksIntegrationProps) => {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if user can manage QuickBooks (admin/owner only)
  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

  // Check for feature flag
  const featureEnabled = isQuickBooksEnabled();
  const isConfigured = isQuickBooksConfigured();

  // Note: OAuth callback results (qb_connected, error params) are handled at the 
  // Organization page level to avoid duplicate toasts. See Organization.tsx.

  // Query for connection status
  const { 
    data: connectionStatus, 
    isLoading: statusLoading,
    error: statusError
  } = useQuery({
    queryKey: ['quickbooks', 'connection', currentOrganization?.id],
    queryFn: () => getConnectionStatus(currentOrganization!.id),
    enabled: !!currentOrganization?.id && canManage && featureEnabled,
    staleTime: 60 * 1000, // 1 minute
  });

  // Mutation for disconnecting
  const disconnectMutation = useMutation({
    mutationFn: () => disconnectQuickBooks(currentOrganization!.id),
    onSuccess: () => {
      toast.success('QuickBooks disconnected successfully');
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'connection'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to disconnect: ${error.message}`);
    },
  });

  // Mutation for manual token refresh
  const refreshMutation = useMutation({
    mutationFn: manualTokenRefresh,
    onSuccess: (result) => {
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'connection'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to refresh tokens: ${error.message}`);
    },
  });

  // Handle connect button click
  const handleConnect = async () => {
    if (!currentOrganization?.id) return;

    setIsConnecting(true);
    try {
      const authUrl = await generateQuickBooksAuthUrl({
        organizationId: currentOrganization.id,
        redirectUrl: window.location.pathname,
      });
      // Redirect to QuickBooks OAuth
      window.location.href = authUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start OAuth flow';
      toast.error(message);
      setIsConnecting(false);
    }
  };

  // Handle disconnect button click
  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to disconnect QuickBooks? Team-customer mappings will be preserved.')) {
      disconnectMutation.mutate();
    }
  };

  // Don't render if feature is disabled
  if (!featureEnabled) {
    return null;
  }

  // Don't render if user doesn't have permission
  if (!canManage) {
    return null;
  }

  // Show configuration warning if not configured
  if (!isConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            QuickBooks Online Integration
          </CardTitle>
          <CardDescription>
            Connect your QuickBooks Online account to export invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              QuickBooks integration is not configured. Please contact your administrator to set up the VITE_INTUIT_CLIENT_ID environment variable.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const isConnected = connectionStatus?.isConnected;
  const isTokenExpiring = connectionStatus?.isAccessTokenValid === false;
  const isRefreshTokenExpired = connectionStatus?.isRefreshTokenValid === false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          QuickBooks Online Integration
        </CardTitle>
        <CardDescription>
          Connect your QuickBooks Online account to export work orders as invoices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {statusLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Checking connection status...
          </div>
        ) : statusError ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to check connection status. Please try again.
            </AlertDescription>
          </Alert>
        ) : isConnected ? (
          <>
            {/* Connected State */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
              {connectionStatus?.realmId && (
                <span className="text-sm text-muted-foreground">
                  Company ID: {connectionStatus.realmId}
                </span>
              )}
            </div>

            {/* Token Status */}
            {isRefreshTokenExpired ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Your QuickBooks authorization has expired. Please reconnect to continue exporting invoices.
                </AlertDescription>
              </Alert>
            ) : isTokenExpiring ? (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Access token will refresh automatically.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshMutation.mutate()}
                    disabled={refreshMutation.isPending}
                  >
                    {refreshMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    Refresh Now
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}

            {/* Connection Info */}
            {connectionStatus?.connectedAt && (
              <div className="text-sm text-muted-foreground">
                Connected on {new Date(connectionStatus.connectedAt).toLocaleDateString()}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {isRefreshTokenExpired ? (
                <Button 
                  onClick={handleConnect}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  Reconnect QuickBooks
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Unlink className="h-4 w-4 mr-2" />
                  )}
                  Disconnect
                </Button>
              )}
              <Button 
                variant="ghost"
                size="icon"
                asChild
              >
                <a 
                  href="https://appcenter.intuit.com/app/connect" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  title="Manage QuickBooks connections"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Not Connected State */}
            <p className="text-sm text-muted-foreground">
              Connect your QuickBooks Online account to automatically export work orders as draft invoices. 
              Team-customer mappings allow you to associate each team with a QuickBooks customer.
            </p>

            <div className="pt-2">
              <Button 
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Connect to QuickBooks Online
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              You will be redirected to Intuit to authorize the connection. 
              Only organization admins and owners can connect QuickBooks.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickBooksIntegration;

