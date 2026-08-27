// fallow-ignore-file code-duplication
// Duplication rationale: Org settings route shares org hub page shell with members/integrations siblings
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePendingWorkspaceMergeRequests } from '@/features/organization/hooks/useWorkspacePersonalOrgMerge';
import { useOrganizationIntegrationOAuthCallbacks } from '@/features/organization/hooks/useOrganizationIntegrationOAuthCallbacks';
import {
  ORGANIZATION_INTEGRATIONS_PATH,
  ORGANIZATION_MEMBERS_PATH,
} from '@/features/organization/constants/routes';
import { OrganizationSettings } from '@/features/organization/components/OrganizationSettings';
import { OrganizationSubnav } from '@/features/organization/components/OrganizationSubnav';
import RestrictedOrganizationAccess from '@/features/organization/components/RestrictedOrganizationAccess';
import { WorkspaceMergeRequestsCard } from '@/features/organization/components/WorkspaceMergeRequestsCard';
import { usePermissions } from '@/hooks/usePermissions';
import Page from '@/components/layout/Page';
import { Card, CardContent } from '@/components/ui/card';
import { Settings } from 'lucide-react';

const Organization = () => {
  const { currentOrganization, isLoading } = useOrganization();
  const navigate = useNavigate();
  const { canManageOrganization } = usePermissions();
  useOrganizationIntegrationOAuthCallbacks();

  useEffect(() => {
    if (window.location.hash === '#integrations') {
      navigate(ORGANIZATION_INTEGRATIONS_PATH, { replace: true });
      return;
    }
    if (window.location.hash === '#members') {
      navigate(ORGANIZATION_MEMBERS_PATH, { replace: true });
    }
  }, [navigate]);

  const { data: mergeRequests = [] } = usePendingWorkspaceMergeRequests();

  const currentUserRole: 'owner' | 'admin' | 'member' =
    currentOrganization?.userRole === 'owner' || currentOrganization?.userRole === 'admin'
      ? currentOrganization.userRole
      : 'member';
  const currentOrganizationId = currentOrganization?.id;
  const hasOrganizationSettingsAccess = canManageOrganization();
  const incomingMergeRequests = useMemo(() => {
    if (!currentOrganizationId) {
      return [];
    }

    return mergeRequests.filter(
      (request) => request.is_incoming && request.workspace_org_id === currentOrganizationId,
    );
  }, [mergeRequests, currentOrganizationId]);

  if (isLoading || !currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Organization Settings</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Page>
    );
  }

  if (!hasOrganizationSettingsAccess) {
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
        <RestrictedOrganizationAccess currentOrganizationName={currentOrganization.name} />
      </Page>
    );
  }

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-4 sm:space-y-6">
        <OrganizationSubnav />

        {incomingMergeRequests.length > 0 && currentOrganizationId && (
          <WorkspaceMergeRequestsCard
            workspaceOrgId={currentOrganizationId}
            requests={incomingMergeRequests}
          />
        )}

        <div className="pb-1 sm:pb-4 border-b">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border bg-muted/40 p-2.5 shrink-0">
              <Settings className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Organization Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Update branding, privacy, and organization details for {currentOrganization.name}.
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="px-3 py-4 sm:px-6 sm:py-6">
            <OrganizationSettings organization={currentOrganization} currentUserRole={currentUserRole} />
          </CardContent>
        </Card>
      </div>
    </Page>
  );
};

export default Organization;
