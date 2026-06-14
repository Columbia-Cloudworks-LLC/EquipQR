import React from 'react';
import { QuickBooksIntegration } from './QuickBooksIntegration';
import { GoogleWorkspaceIntegration } from './GoogleWorkspaceIntegration';
import { GoogleWorkspaceExportDestinationCard } from './GoogleWorkspaceExportDestinationCard';

interface OrganizationIntegrationsPanelProps {
  currentUserRole: 'owner' | 'admin' | 'member';
}

const OrganizationIntegrationsPanel: React.FC<OrganizationIntegrationsPanelProps> = ({
  currentUserRole,
}) => {
  return (
    <div className="divide-y divide-border/60 sm:divide-y-0 sm:space-y-3">
      <QuickBooksIntegration currentUserRole={currentUserRole} />
      <GoogleWorkspaceIntegration currentUserRole={currentUserRole} />
      <GoogleWorkspaceExportDestinationCard currentUserRole={currentUserRole} />
    </div>
  );
};

export default OrganizationIntegrationsPanel;
