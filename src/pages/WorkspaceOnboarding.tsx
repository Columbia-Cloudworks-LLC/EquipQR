import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSession } from '@/hooks/useSession';
import { useWorkspaceOnboardingState } from '@/hooks/useWorkspaceOnboarding';
import { useAppToast } from '@/hooks/useAppToast';
import {
  getGoogleWorkspaceConnectionStatus,
  listWorkspaceDirectoryUsers,
  selectGoogleWorkspaceMembers,
  syncGoogleWorkspaceUsers,
} from '@/services/google-workspace';
import { generateGoogleWorkspaceAuthUrl, isGoogleWorkspaceConfigured } from '@/services/google-workspace/auth';
import { isConsumerGoogleDomain } from '@/utils/google-workspace';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const WorkspaceOnboarding = () => {
  const { user } = useAuth();
  const { refreshSession } = useSession();
  const { switchOrganization } = useOrganization();
  const { toast } = useAppToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: onboardingState, isLoading, refetch } = useWorkspaceOnboardingState();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [adminEmails, setAdminEmails] = useState<Set<string>>(new Set());

  // Handle OAuth callback parameters
  const gwError = searchParams.get('gw_error');
  const gwErrorDescription = searchParams.get('gw_error_description');
  const gwConnected = searchParams.get('gw_connected');

  // Clear query params after displaying them
  useEffect(() => {
    if (gwError || gwConnected) {
      // Show toast for success
      if (gwConnected === 'true') {
        toast({
          title: 'Google Workspace connected',
          description: 'Your organization is now connected to Google Workspace.',
        });
        // Refresh data after successful connection
        refetch();
        refreshSession();
      }
      // Clear the query params
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('gw_error');
      newParams.delete('gw_error_description');
      newParams.delete('gw_connected');
      setSearchParams(newParams, { replace: true });
    }
  }, [gwError, gwConnected, searchParams, setSearchParams, toast, refetch, refreshSession]);

  const isGoogleUser = useMemo(() => {
    const provider = (user?.app_metadata as { provider?: string })?.provider;
    const providers = (user?.app_metadata as { providers?: string[] })?.providers || [];
    return provider === 'google' || providers.includes('google');
  }, [user]);

  const domain = onboardingState?.domain || null;
  const isConsumerDomain = isConsumerGoogleDomain(domain);

  const workspaceOrgId = onboardingState?.workspace_org_id || null;

  const { data: connectionStatus } = useQuery({
    queryKey: ['google-workspace', 'connection', workspaceOrgId],
    queryFn: () => getGoogleWorkspaceConnectionStatus(workspaceOrgId!),
    enabled: !!workspaceOrgId,
    staleTime: 60 * 1000,
  });

  const { data: directoryUsers = [] } = useQuery({
    queryKey: ['google-workspace', 'directory-users', workspaceOrgId],
    queryFn: () => listWorkspaceDirectoryUsers(workspaceOrgId!),
    enabled: !!workspaceOrgId && connectionStatus?.is_connected,
    staleTime: 60 * 1000,
  });

  // Switch to the workspace organization if connected
  useEffect(() => {
    if (gwConnected === 'true' && workspaceOrgId) {
      switchOrganization(workspaceOrgId);
    }
  }, [gwConnected, workspaceOrgId, switchOrganization]);

  const handleConnectWorkspace = async () => {
    setIsConnecting(true);
    try {
      // For first-time setup, don't pass organization_id - the callback will create one
      const authUrl = await generateGoogleWorkspaceAuthUrl({
        organizationId: workspaceOrgId || '',
        redirectUrl: '/dashboard/onboarding/workspace',
      });
      window.location.href = authUrl;
    } catch (error) {
      toast({
        title: 'Failed to start Google Workspace connection',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
      setIsConnecting(false);
    }
  };

  const handleSyncUsers = async () => {
    if (!workspaceOrgId) return;
    setIsSyncing(true);
    try {
      const result = await syncGoogleWorkspaceUsers(workspaceOrgId);
      toast({ title: 'Directory synced', description: `${result.usersSynced} users loaded.` });
      await queryClient.invalidateQueries({ queryKey: ['google-workspace', 'directory-users', workspaceOrgId] });
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

  const toggleEmail = (email: string, checked: boolean) => {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(email);
      } else {
        next.delete(email);
      }
      return next;
    });

    if (!checked) {
      setAdminEmails(prev => {
        const next = new Set(prev);
        next.delete(email);
        return next;
      });
    }
  };

  const toggleAdmin = (email: string, checked: boolean) => {
    setAdminEmails(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(email);
      } else {
        next.delete(email);
      }
      return next;
    });
  };

  const handleAddMembers = async () => {
    if (!workspaceOrgId || selectedEmails.size === 0) return;
    try {
      const result = await selectGoogleWorkspaceMembers(
        workspaceOrgId,
        Array.from(selectedEmails),
        Array.from(adminEmails)
      );
      toast({
        title: 'Members added',
        description: `${result.members_added} members added. ${result.admin_applied} admins applied; ${result.admin_pending} pending.`,
      });
      setSelectedEmails(new Set());
      setAdminEmails(new Set());
      await refetch();
    } catch (error) {
      toast({
        title: 'Failed to add members',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    }
  };

  if (isLoading) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader title="Workspace Onboarding" description="Preparing your Google Workspace setup..." />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Page>
    );
  }

  if (!user || !isGoogleUser || !onboardingState || isConsumerDomain) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <PageHeader
          title="Workspace Onboarding"
          description="Google Workspace onboarding is available for business Google accounts."
        />
        <Alert>
          <AlertDescription>
            Sign in with your Google Workspace account to start setup.
          </AlertDescription>
        </Alert>
      </Page>
    );
  }

  const isConnected = connectionStatus?.is_connected;
  const showConnectButton = !isConnected;

  return (
    <Page maxWidth="7xl" padding="responsive">
      <PageHeader
        title="Workspace Onboarding"
        description={`Set up EquipQR for ${onboardingState.domain}`}
      />

      <div className="space-y-6">
        {/* Error Alert */}
        {gwError && gwErrorDescription && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Failed</AlertTitle>
            <AlertDescription>{gwErrorDescription}</AlertDescription>
          </Alert>
        )}

        {/* Connect Workspace Card */}
        {showConnectButton && (
          <Card>
            <CardHeader>
              <CardTitle>Connect Google Workspace</CardTitle>
              <CardDescription>
                Connect your Google Workspace to set up your organization and import users.
                Only Google Workspace administrators can complete this step.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isGoogleWorkspaceConfigured() && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Google Workspace integration is not configured. Contact your administrator.
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleConnectWorkspace} 
                disabled={!isGoogleWorkspaceConfigured() || isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect Google Workspace'
                )}
              </Button>

              <p className="text-sm text-muted-foreground">
                You will be redirected to Google to authorize EquipQR to access your Workspace directory.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Connected Status + Sync Card */}
        {isConnected && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Google Workspace Connected
                </CardTitle>
                <CardDescription>
                  Your organization is connected to Google Workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div>Connected domain: {connectionStatus.domain}</div>
                <div>Connected on: {connectionStatus.connected_at ? new Date(connectionStatus.connected_at).toLocaleDateString() : 'Unknown'}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sync Directory Users</CardTitle>
                <CardDescription>
                  Sync your Google Workspace directory and select the members you want to add.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleSyncUsers} disabled={isSyncing}>
                  {isSyncing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    'Sync Directory'
                  )}
                </Button>

                {directoryUsers.length > 0 && (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Include</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Make Admin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {directoryUsers.map((dirUser) => {
                          const email = dirUser.primary_email;
                          const isSelected = selectedEmails.has(email);
                          const isAdmin = adminEmails.has(email);
                          return (
                            <TableRow key={dirUser.id}>
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => toggleEmail(email, Boolean(checked))}
                                  aria-label={`Select ${email}`}
                                />
                              </TableCell>
                              <TableCell>{email}</TableCell>
                              <TableCell>{dirUser.full_name || '-'}</TableCell>
                              <TableCell>
                                <Checkbox
                                  checked={isAdmin}
                                  disabled={!isSelected}
                                  onCheckedChange={(checked) => toggleAdmin(email, Boolean(checked))}
                                  aria-label={`Make admin ${email}`}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    <Button
                      onClick={handleAddMembers}
                      disabled={selectedEmails.size === 0}
                    >
                      Add Selected Members
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Page>
  );
};

export default WorkspaceOnboarding;
