import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrganizationMembersQuery } from '@/features/organization/hooks/useOrganizationMembers';
import { useIncomingWorkspaceMergeRequests } from '@/features/organization/hooks/useIncomingWorkspaceMergeRequests';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { OrganizationHubPage } from '@/features/organization/components/OrganizationHubPage';
import UnifiedMembersList from '@/features/organization/components/UnifiedMembersList';
import { PendingProvisionedStaffCard } from '@/features/onboarding/components/PendingProvisionedStaffCard';
import { Users } from 'lucide-react';

const OrganizationMembers = () => {
  const { currentOrganization, isLoading } = useOrganization();
  const { data: members = [], isLoading: membersLoading } = useOrganizationMembersQuery(
    currentOrganization?.id || '',
  );
  const permissions = usePagePermissions(currentOrganization);
  const incomingMergeRequests = useIncomingWorkspaceMergeRequests(currentOrganization?.id);

  const currentUserRole: 'owner' | 'admin' | 'member' = currentOrganization?.userRole || 'member';

  return (
    <OrganizationHubPage
      organization={currentOrganization}
      isLoading={isLoading}
      title="Members"
      icon={Users}
      description={(name) => `Invite teammates and import users from Google Workspace for ${name}.`}
      hasAccess={currentUserRole !== 'member'}
      incomingMergeRequests={incomingMergeRequests}
    >
      {(organization) => (
        <>
          <UnifiedMembersList
            members={members}
            organizationId={organization.id}
            currentUserRole={currentUserRole}
            isLoading={membersLoading}
            canInviteMembers={!!permissions?.canInviteMembers}
          />

          <PendingProvisionedStaffCard
            organizationId={organization.id}
            canRevoke={!organization.isSupportAccess}
          />
        </>
      )}
    </OrganizationHubPage>
  );
};

export default OrganizationMembers;
