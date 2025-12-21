import React from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrganizationMembersQuery } from '@/hooks/useOrganizationMembers';
import { usePagePermissions } from '@/hooks/usePagePermissions';

import OrganizationHeader from '@/features/organization/components/OrganizationHeader';
import OrganizationTabs from '@/features/organization/components/OrganizationTabs';
import RestrictedOrganizationAccess from '@/features/organization/components/RestrictedOrganizationAccess';
import Page from '@/components/layout/Page';

const Organization = () => {
  const { currentOrganization, isLoading } = useOrganization();

  // Custom hooks for data and business logic
  const { data: members = [], isLoading: membersLoading } = useOrganizationMembersQuery(currentOrganization?.id || '');
  const permissions = usePagePermissions(currentOrganization);
  

  const currentUserRole: 'owner' | 'admin' | 'member' = currentOrganization?.userRole || 'member';

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
    return (
      <RestrictedOrganizationAccess 
        currentOrganizationName={currentOrganization.name}
      />
    );
  }

  return (
    <Page maxWidth="7xl" padding="responsive">
      <div className="space-y-4 sm:space-y-6">
        <OrganizationHeader 
          organizationName={currentOrganization.name}
          currentUserRole={currentUserRole}
        />

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

