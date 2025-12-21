
import React from 'react';
import { SessionOrganization } from '@/contexts/SessionContext';
import { SecurityStatus } from '@/components/security/SecurityStatus';
import { SessionStatus } from '@/components/session/SessionStatus';

interface OrganizationSidebarProps {
  organization: SessionOrganization;
  onUpgrade: () => void;
}

const OrganizationSidebar: React.FC<OrganizationSidebarProps> = ({
  organization,
  onUpgrade
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="lg:sticky lg:top-6">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Current organization</p>
          <p className="text-base font-semibold">{organization.name}</p>
        </div>
      </div>
      <div className="lg:sticky lg:top-6">
        <SessionStatus />
      </div>
      <div className="lg:sticky lg:top-6">
        <SecurityStatus />
      </div>
      {/* Billing component removed - app is now free/unlimited */}
    </div>
  );
};

export default OrganizationSidebar;

