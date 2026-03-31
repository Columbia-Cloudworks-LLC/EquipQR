import { Link } from 'react-router-dom';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import Page from '@/components/layout/Page';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useDsrQueue } from '@/features/dsr/hooks/useDsrQueue';
import { DsrQueueRail } from '@/features/dsr/components/DsrQueueRail';

function DSRCockpitPage() {
  const { currentOrganization } = useOrganization();
  const { canManageOrganization } = usePermissions();
  const canManageDsr = canManageOrganization();
  const organizationId = canManageDsr ? currentOrganization?.id ?? null : null;
  const queueQuery = useDsrQueue(organizationId);

  if (!currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Organization Selected</AlertTitle>
          <AlertDescription>Select an organization to view the DSR cockpit.</AlertDescription>
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
          <AlertDescription>Only organization owners/admins can access this cockpit.</AlertDescription>
        </Alert>
      </Page>
    );
  }

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">DSR Cockpit</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Privacy request operations workspace for admins.
            </p>
          </div>
        </div>

        {queueQuery.isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Queue Error</AlertTitle>
            <AlertDescription>
              {queueQuery.error instanceof Error ? queueQuery.error.message : 'Failed to load queue'}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <DsrQueueRail requests={queueQuery.data ?? []} />
          <Card>
            <CardHeader>
              <CardTitle>Select a request</CardTitle>
              <CardDescription>Choose a case from the queue rail to open the full workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              {(queueQuery.data?.length ?? 0) > 0 ? (
                <Link
                  to={`/dashboard/dsr/${queueQuery.data?.[0]?.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Open first queue item
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">No requests available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Page>
  );
}

export default DSRCockpitPage;
