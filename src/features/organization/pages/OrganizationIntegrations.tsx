// fallow-ignore-file code-duplication
// Duplication rationale: Integrations route shares org hub page shell
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrganizationIntegrationOAuthCallbacks } from '@/features/organization/hooks/useOrganizationIntegrationOAuthCallbacks';
import OrganizationIntegrationsPanel from '@/features/organization/components/OrganizationIntegrationsPanel';
import RestrictedOrganizationAccess from '@/features/organization/components/RestrictedOrganizationAccess';
import Page from '@/components/layout/Page';
import { Card, CardContent } from '@/components/ui/card';
import { Plug } from 'lucide-react';

const OrganizationIntegrations = () => {
  const { currentOrganization, isLoading } = useOrganization();
  useOrganizationIntegrationOAuthCallbacks();

  const currentUserRole: 'owner' | 'admin' | 'member' =
    currentOrganization?.userRole || 'member';

  if (isLoading || !currentOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Integrations</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Page>
    );
  }

  if (currentUserRole === 'member') {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <RestrictedOrganizationAccess currentOrganizationName={currentOrganization.name} />
      </Page>
    );
  }

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-4 sm:space-y-6">
        <div className="pb-4 border-b">
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Integrations</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Connect third-party services for {currentOrganization.name}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <OrganizationIntegrationsPanel currentUserRole={currentUserRole} />
          </CardContent>
        </Card>
      </div>
    </Page>
  );
};

export default OrganizationIntegrations;
