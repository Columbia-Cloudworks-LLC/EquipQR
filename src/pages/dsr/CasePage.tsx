import { useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import Page from '@/components/layout/Page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useDsrCase, useDsrMutation } from '@/features/dsr/hooks/useDsrCase';
import { DsrCaseWorkspace } from '@/features/dsr/components/DsrCaseWorkspace';
import { DsrQueueRail } from '@/features/dsr/components/DsrQueueRail';

function DSRCasePage() {
  const { requestId } = useParams();
  const { currentOrganization } = useOrganization();
  const { canManageOrganization } = usePermissions();
  const canManageDsr = canManageOrganization();
  const organizationId = canManageDsr ? currentOrganization?.id ?? null : null;
  const caseQuery = useDsrCase(organizationId, requestId ?? null);
  const mutation = useDsrMutation(organizationId, requestId ?? null);

  if (!currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Organization Selected</AlertTitle>
          <AlertDescription>Select an organization to open the case workspace.</AlertDescription>
        </Alert>
      </Page>
    );
  }

  if (!canManageDsr) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Restricted</AlertTitle>
          <AlertDescription>Only organization owners/admins can access this case workspace.</AlertDescription>
        </Alert>
      </Page>
    );
  }

  if (caseQuery.isLoading) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <p className="text-sm text-muted-foreground">Loading case...</p>
      </Page>
    );
  }

  if (caseQuery.isError || !caseQuery.data?.request) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Case not available</AlertTitle>
          <AlertDescription>
            {caseQuery.error instanceof Error ? caseQuery.error.message : 'Failed to load case'}
          </AlertDescription>
        </Alert>
      </Page>
    );
  }

  const { request, events } = caseQuery.data;
  const queueRequests = request ? [request] : [];

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <DsrQueueRail requests={queueRequests} selectedRequestId={request.id} />
        <DsrCaseWorkspace
          request={request}
          events={events}
          canManageDsr={canManageDsr}
          pending={mutation.isPending}
          onMutate={async (action, payload) => {
            await mutation.mutateAsync({
              action,
              expectedUpdatedAt: request.updated_at,
              payload,
            });
          }}
        />
      </div>
    </Page>
  );
}

export default DSRCasePage;
