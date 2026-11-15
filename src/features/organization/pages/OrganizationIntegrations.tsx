import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrganizationIntegrationOAuthCallbacks } from '@/features/organization/hooks/useOrganizationIntegrationOAuthCallbacks';
import OrganizationIntegrationsPanel from '@/features/organization/components/OrganizationIntegrationsPanel';
import { OrganizationHubPage } from '@/features/organization/components/OrganizationHubPage';
import { Card, CardContent } from '@/components/ui/card';
import { Plug } from 'lucide-react';

const OrganizationIntegrations = () => {
  const { currentOrganization, isLoading } = useOrganization();
  useOrganizationIntegrationOAuthCallbacks();

  const currentUserRole: 'owner' | 'admin' | 'member' =
    currentOrganization?.userRole || 'member';

  return (
    <OrganizationHubPage
      organization={currentOrganization}
      isLoading={isLoading}
      title="Integrations"
      icon={Plug}
      description={(name) => `Connect third-party services for ${name}`}
      hasAccess={currentUserRole !== 'member'}
    >
      {() => (
        <Card>
          <CardContent className="px-3 py-4 sm:px-6 sm:py-6">
            <OrganizationIntegrationsPanel currentUserRole={currentUserRole} />
          </CardContent>
        </Card>
      )}
    </OrganizationHubPage>
  );
};

export default OrganizationIntegrations;
