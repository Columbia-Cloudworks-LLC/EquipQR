/**
 * QuickBooks Integration Component
 *
 * Compact horizontal-row layout showing connection status and actions.
 */

import { useState } from 'react';
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
  Clock,
  Loader2,
} from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  generateQuickBooksAuthUrl,
  isQuickBooksConfigured,
  getConnectionStatus,
  disconnectQuickBooks,
  manualTokenRefresh,
} from '@/services/quickbooks';
import { isQuickBooksEnabled } from '@/lib/flags';
import { useQuickBooksAccess } from '@/hooks/useQuickBooksAccess';
import { toast } from 'sonner';

interface QuickBooksIntegrationProps {
  /** @deprecated - No longer used. Permission is now derived from useQuickBooksAccess hook. */
  currentUserRole?: 'owner' | 'admin' | 'member';
}

export const QuickBooksIntegration = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  currentUserRole: _currentUserRole,
}: QuickBooksIntegrationProps) => {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: canManage = false, isLoading: permissionLoading } = useQuickBooksAccess();

  const featureEnabled = isQuickBooksEnabled();
  const isConfigured = isQuickBooksConfigured();

  const {
    data: connectionStatus,
    isLoading: statusLoading,
    error: statusError,
  } = useQuery({
    queryKey: ['quickbooks', 'connection', currentOrganization?.id],
    queryFn: () => getConnectionStatus(currentOrganization!.id),
    enabled: !!currentOrganization?.id && canManage && featureEnabled,
    staleTime: 60 * 1000,
  });

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

  const handleConnect = async () => {
    if (!currentOrganization?.id) return;

    setIsConnecting(true);
    try {
      const authUrl = await generateQuickBooksAuthUrl({
        organizationId: currentOrganization.id,
        redirectUrl: window.location.pathname,
      });
      window.location.href = authUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start OAuth flow';
      toast.error(message);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to disconnect QuickBooks? Team-customer mappings will be preserved.')) {
      disconnectMutation.mutate();
    }
  };

  if (!featureEnabled || (!permissionLoading && !canManage)) {
    return null;
  }

  if (permissionLoading || statusLoading) {
    return (
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading QuickBooks...
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="rounded-lg border p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">QuickBooks Online</p>
            <p className="text-xs text-muted-foreground">Export work orders as draft invoices</p>
          </div>
          <Badge variant="secondary" className="self-start sm:self-auto">Not configured</Badge>
        </div>
      </div>
    );
  }

  if (statusError) {
    return (
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">QuickBooks Online</p>
            <p className="text-xs text-muted-foreground">Export work orders as draft invoices</p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Failed to check connection status.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isConnected = connectionStatus?.isConnected;
  const isTokenExpiring = connectionStatus?.isAccessTokenValid === false;
  const isRefreshTokenExpired = connectionStatus?.isRefreshTokenValid === false;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">QuickBooks Online</p>
            {isConnected ? (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Not connected</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Export work orders as draft invoices
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isConnected ? (
            <>
              {isRefreshTokenExpired ? (
                <Button size="sm" onClick={handleConnect} disabled={isConnecting}>
                  {isConnecting && <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                  Reconnect
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Unlink className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Disconnect
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <a
                  href="https://appcenter.intuit.com/app/connect"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Manage QuickBooks connections (opens in new tab)"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
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

      {/* Token status alerts — only shown when connected with issues */}
      {isConnected && isRefreshTokenExpired && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Authorization expired. Reconnect to continue exporting invoices.
          </AlertDescription>
        </Alert>
      )}

      {isConnected && !isRefreshTokenExpired && isTokenExpiring && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Access token will refresh automatically
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            {refreshMutation.isPending && <RefreshCw className="h-3 w-3 animate-spin mr-1" />}
            Refresh Now
          </Button>
        </div>
      )}
    </div>
  );
};

export default QuickBooksIntegration;
