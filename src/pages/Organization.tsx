
import React, { useState } from 'react';
import { useSimpleOrganization } from '@/hooks/useSimpleOrganization';
import { useOptimizedOrganizationMembers } from '@/hooks/useOptimizedOrganizationMembers';
import { usePagePermissions } from '@/hooks/usePagePermissions';

import { useFleetMapSubscription } from '@/hooks/useFleetMapSubscription';
import OrganizationHeader from '@/components/organization/OrganizationHeader';
import OrganizationTabs from '@/components/organization/OrganizationTabs';
import { OrganizationSettingsDialog } from '@/components/organization/OrganizationSettingsDialog';
import RestrictedOrganizationAccess from '@/components/organization/RestrictedOrganizationAccess';

const Organization = () => {
  const { currentOrganization, isLoading } = useSimpleOrganization();
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  // Custom hooks for data and business logic
  const { data: members = [], isLoading: membersLoading } = useOptimizedOrganizationMembers(currentOrganization?.id || '');
  const { data: fleetMapSubscription } = useFleetMapSubscription(currentOrganization?.id || '');
  const permissions = usePagePermissions(currentOrganization);
  

  const currentUserRole: 'owner' | 'admin' | 'member' = currentOrganization?.userRole || 'member';

  // Loading state
  if (isLoading || !currentOrganization) {
    return (
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Organization</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Loading...</p>
        </div>
      </div>
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

  // Event handlers
  const handleSettingsClick = () => {
    setSettingsDialogOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <OrganizationHeader 
        organizationName={currentOrganization.name}
        onSettingsClick={handleSettingsClick}
        currentUserRole={currentUserRole}
      />

      <OrganizationTabs
        members={members}
        organizationId={currentOrganization.id}
        currentUserRole={currentUserRole}
        permissions={permissions}
        membersLoading={membersLoading}
        fleetMapSubscription={fleetMapSubscription}
      />

      <OrganizationSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        organization={currentOrganization}
        currentUserRole={currentUserRole}
      />
    </div>
  );
};

export default Organization;
