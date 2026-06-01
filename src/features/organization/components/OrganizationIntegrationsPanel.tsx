import React from 'react';
import { QuickBooksIntegration } from './QuickBooksIntegration';
import { GoogleWorkspaceIntegration } from './GoogleWorkspaceIntegration';
import { GoogleWorkspaceExportDestinationCard } from './GoogleWorkspaceExportDestinationCard';

interface OrganizationIntegrationsPanelProps {
  currentUserRole: 'owner' | 'admin' | 'member';
}

export const OrganizationIntegrationsPanel: React.FC<OrganizationIntegrationsPanelProps> = ({
  currentUserRole,
}) => {
  return (
    <div className="space-y-3">
      <QuickBooksIntegration currentUserRole={currentUserRole} />
      <GoogleWorkspaceIntegration currentUserRole={currentUserRole} />
      <GoogleWorkspaceExportDestinationCard currentUserRole={currentUserRole} />
    </div>
  );
};

export default OrganizationIntegrationsPanel;
