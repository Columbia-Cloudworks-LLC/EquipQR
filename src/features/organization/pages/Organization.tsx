import { useEffect, useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrganizationMembersQuery } from '@/features/organization/hooks/useOrganizationMembers';
import { usePendingWorkspaceMergeRequests } from '@/features/organization/hooks/useWorkspacePersonalOrgMerge';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import OrganizationHeader from '@/features/organization/components/OrganizationHeader';
import OrganizationTabs from '@/features/organization/components/OrganizationTabs';
import RestrictedOrganizationAccess from '@/features/organization/components/RestrictedOrganizationAccess';
import { WorkspaceMergeRequestsCard } from '@/features/organization/components/WorkspaceMergeRequestsCard';
import Page from '@/components/layout/Page';

const Organization = () => {
  const { currentOrganization, isLoading } = useOrganization();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Handle QuickBooks OAuth callback results at the page level
  // This ensures the toast is shown even if the Settings tab isn't active
  useEffect(() => {
    const error = searchParams.get('qb_error');
    const errorDescription = searchParams.get('qb_error_description');
    const success = searchParams.get('qb_connected');

    if (error) {
      toast.error(errorDescription || 'Failed to connect QuickBooks');
      // Clear the error params
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('qb_error');
      newParams.delete('qb_error_description');
      setSearchParams(newParams, { replace: true });
    } else if (success) {
      toast.success('QuickBooks connected successfully!');
      // Refresh connection status
      queryClient.invalidateQueries({ queryKey: ['quickbooks', 'connection'] });
      // Clear the success param
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('qb_connected');
      newParams.delete('realm_id');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient]);

  // Custom hooks for data and business logic
  const { data: members = [], isLoading: membersLoading } = useOrganizationMembersQuery(currentOrganization?.id || '');
  const permissions = usePagePermissions(currentOrganization);
  const { data: mergeRequests = [] } = usePendingWorkspaceMergeRequests();
  

  const currentUserRole: 'owner' | 'admin' | 'member' = currentOrganization?.userRole || 'member';
  const currentOrganizationId = currentOrganization?.id;
  const incomingMergeRequests = useMemo(() => {
    if (!currentOrganizationId) {
      return [];
    }

    return mergeRequests.filter(
      (request) => request.is_incoming && request.workspace_org_id === currentOrganizationId
    );
  }, [mergeRequests, currentOrganizationId]);

  // Loading state
  if (isLoading || !currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Organization</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Page>
    );
  }

  // Restrict access for regular members
  if (currentUserRole === 'member') {
    if (incomingMergeRequests.length > 0) {
      return (
        <Page maxWidth="7xl" padding="responsive">
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Personal Organization Merge</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Review a request to merge your personal data into {currentOrganization.name}.
              </p>
            </div>
            {currentOrganizationId && (
              <WorkspaceMergeRequestsCard
                workspaceOrgId={currentOrganizationId}
                requests={incomingMergeRequests}
              />
            )}
          </div>
        </Page>
      );
    }

    return (
      <Page maxWidth="7xl" padding="responsive">
        <RestrictedOrganizationAccess 
          currentOrganizationName={currentOrganization.name}
        />
      </Page>
    );
  }

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-4 sm:space-y-6">
        <OrganizationHeader 
          organizationName={currentOrganization.name}
          currentUserRole={currentUserRole}
        />

        {incomingMergeRequests.length > 0 && currentOrganizationId && (
          <WorkspaceMergeRequestsCard
            workspaceOrgId={currentOrganizationId}
            requests={incomingMergeRequests}
          />
        )}

        <OrganizationTabs
          members={members}
          organizationId={currentOrganization.id}
          currentUserRole={currentUserRole}
          permissions={permissions}
          membersLoading={membersLoading}
          organization={currentOrganization}
        />
      </div>
    </Page>
  );
};

export default Organization;

