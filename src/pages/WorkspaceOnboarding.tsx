import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Page from '@/components/layout/Page';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSession } from '@/hooks/useSession';
import { useWorkspaceOnboardingState } from '@/hooks/useWorkspaceOnboarding';
import { useAppToast } from '@/hooks/useAppToast';
import {
  createWorkspaceOrganizationForDomain,
  getGoogleWorkspaceConnectionStatus,
  listWorkspaceDirectoryUsers,
  requestWorkspaceDomainClaim,
  selectGoogleWorkspaceMembers,
  sendWorkspaceDomainClaimEmail,
  syncGoogleWorkspaceUsers,
} from '@/services/google-workspace';
import { generateGoogleWorkspaceAuthUrl, isGoogleWorkspaceConfigured } from '@/services/google-workspace/auth';
import { isConsumerGoogleDomain } from '@/utils/google-workspace';

const WorkspaceOnboarding = () => {
  const { user } = useAuth();
  const { refreshSession } = useSession();
  const { currentOrganization, switchOrganization } = useOrganization();
  const { toast } = useAppToast();
  const queryClient = useQueryClient();

  const { data: onboardingState, isLoading, refetch } = useWorkspaceOnboardingState();

  const [orgName, setOrgName] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRequestingClaim, setIsRequestingClaim] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [adminEmails, setAdminEmails] = useState<Set<string>>(new Set());

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

  const handleRequestClaim = async () => {
    if (!domain) return;
    setIsRequestingClaim(true);
    try {
      await requestWorkspaceDomainClaim(domain, currentOrganization?.id);
      await refetch();

      // Send notification email to admins
      try {
        await sendWorkspaceDomainClaimEmail(domain, currentOrganization?.id);
        toast({
          title: 'Domain claim requested',
          description: 'Admins have been notified and will review your request.',
        });
      } catch {
        // Claim was created but email failed - still show success but warn about email
        toast({
          title: 'Domain claim requested',
          description: 'Your request was submitted, but we could not send the notification email. Please try resending.',
          variant: 'warning',
        });
      }
    } catch (error) {
      toast({
        title: 'Failed to request domain claim',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setIsRequestingClaim(false);
    }
  };

  const handleResendEmail = async () => {
    if (!domain) return;
    setIsSendingEmail(true);
    try {
      await sendWorkspaceDomainClaimEmail(domain, currentOrganization?.id);
      toast({
        title: 'Notification sent',
        description: 'Admins have been notified about your pending request.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      // Check if it's a cooldown error (429 status)
      if (errorMessage.includes('wait') || errorMessage.includes('hour')) {
        toast({
          title: 'Please wait',
          description: errorMessage,
          variant: 'warning',
        });
      } else {
        toast({
          title: 'Failed to send notification',
          description: errorMessage,
          variant: 'error',
        });
      }
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCreateOrg = async () => {
    if (!domain || !orgName.trim()) return;
    setIsCreatingOrg(true);
    try {
      const result = await createWorkspaceOrganizationForDomain(domain, orgName.trim());
      await refreshSession();
      await refetch();
      switchOrganization(result.organization_id);
      toast({ title: 'Workspace organization created' });
    } catch (error) {
      toast({
        title: 'Failed to create organization',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const handleConnectWorkspace = async () => {
    if (!workspaceOrgId) return;
    try {
      const authUrl = await generateGoogleWorkspaceAuthUrl({
        organizationId: workspaceOrgId,
        redirectUrl: '/dashboard/onboarding/workspace',
      });
      window.location.href = authUrl;
    } catch (error) {
      toast({
        title: 'Failed to start Google Workspace connection',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
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

  return (
    <Page maxWidth="7xl" padding="responsive">
      <PageHeader
        title="Workspace Onboarding"
        description={`Set up EquipQR for ${onboardingState.domain}`}
      />

      <div className="space-y-6">
        {onboardingState.domain_status === 'unclaimed' && (
          <Card>
            <CardHeader>
              <CardTitle>Request Domain Setup</CardTitle>
              <CardDescription>
                We need to approve your Google Workspace domain before you can connect it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleRequestClaim} disabled={isRequestingClaim}>
                {isRequestingClaim ? 'Requesting...' : 'Request Approval'}
              </Button>
            </CardContent>
          </Card>
        )}

        {onboardingState.domain_status === 'pending' && (
          <Card>
            <CardHeader>
              <CardTitle>Domain Approval Pending</CardTitle>
              <CardDescription>
                We are reviewing your domain request. We will notify you once approved.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If you haven't received a response, you can resend the approval notification to administrators.
              </p>
              <Button
                variant="outline"
                onClick={handleResendEmail}
                disabled={isSendingEmail}
              >
                {isSendingEmail ? 'Sending...' : 'Resend Approval Email'}
              </Button>
            </CardContent>
          </Card>
        )}

        {onboardingState.domain_status === 'approved' && (
          <Card>
            <CardHeader>
              <CardTitle>Create Workspace Organization</CardTitle>
              <CardDescription>
                Choose the organization name for your Google Workspace directory.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-org-name">Organization Name</Label>
                <Input
                  id="workspace-org-name"
                  value={orgName}
                  onChange={(event) => setOrgName(event.target.value)}
                  placeholder="Company Name"
                />
              </div>
              <Button onClick={handleCreateOrg} disabled={isCreatingOrg || !orgName.trim()}>
                {isCreatingOrg ? 'Creating...' : 'Create Organization'}
              </Button>
            </CardContent>
          </Card>
        )}

        {onboardingState.domain_status === 'claimed' && (
          <Card>
            <CardHeader>
              <CardTitle>Connect Google Workspace</CardTitle>
              <CardDescription>
                Connect your Google Workspace to import users and assign members.
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

              {connectionStatus?.is_connected ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>Connected domain: {connectionStatus.domain}</div>
                  <div>Connected on: {connectionStatus.connected_at ? new Date(connectionStatus.connected_at).toLocaleDateString() : 'Unknown'}</div>
                </div>
              ) : (
                <Button onClick={handleConnectWorkspace} disabled={!isGoogleWorkspaceConfigured()}>
                  Connect Google Workspace
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {onboardingState.domain_status === 'claimed' && connectionStatus?.is_connected && (
          <Card>
            <CardHeader>
              <CardTitle>Sync Directory Users</CardTitle>
              <CardDescription>
                Sync your Google Workspace directory and select the members you want to add.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleSyncUsers} disabled={isSyncing}>
                {isSyncing ? 'Syncing...' : 'Sync Directory'}
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
                      {directoryUsers.map((user) => {
                        const email = user.primary_email;
                        const isSelected = selectedEmails.has(email);
                        const isAdmin = adminEmails.has(email);
                        return (
                          <TableRow key={user.id}>
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => toggleEmail(email, Boolean(checked))}
                                aria-label={`Select ${email}`}
                              />
                            </TableCell>
                            <TableCell>{email}</TableCell>
                            <TableCell>{user.full_name || '-'}</TableCell>
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
        )}
      </div>
    </Page>
  );
};

export default WorkspaceOnboarding;

