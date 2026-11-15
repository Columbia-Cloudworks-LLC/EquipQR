import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useIncomingWorkspaceMergeRequests } from '@/features/organization/hooks/useIncomingWorkspaceMergeRequests';
import { useOrganizationIntegrationOAuthCallbacks } from '@/features/organization/hooks/useOrganizationIntegrationOAuthCallbacks';
import {
  ORGANIZATION_INTEGRATIONS_PATH,
  ORGANIZATION_MEMBERS_PATH,
} from '@/features/organization/constants/routes';
import { OrganizationHubPage } from '@/features/organization/components/OrganizationHubPage';
import { OrganizationSettings } from '@/features/organization/components/OrganizationSettings';
import { usePermissions } from '@/hooks/usePermissions';
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

  const incomingMergeRequests = useIncomingWorkspaceMergeRequests(currentOrganization?.id);

  const currentUserRole: 'owner' | 'admin' | 'member' =
    currentOrganization?.userRole === 'owner' || currentOrganization?.userRole === 'admin'
      ? currentOrganization.userRole
      : 'member';

  return (
    <OrganizationHubPage
      organization={currentOrganization}
      isLoading={isLoading}
      title="Organization Settings"
      icon={Settings}
      description={(name) => `Update branding, privacy, and organization details for ${name}.`}
      hasAccess={canManageOrganization()}
      incomingMergeRequests={incomingMergeRequests}
    >
      {(organization) => (
        <Card>
          <CardContent className="px-3 py-4 sm:px-6 sm:py-6">
            <OrganizationSettings organization={organization} currentUserRole={currentUserRole} />
          </CardContent>
        </Card>
      )}
    </OrganizationHubPage>
  );
};

export default Organization;
