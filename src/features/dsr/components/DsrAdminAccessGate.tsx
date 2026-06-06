import React from 'react';
import { AlertCircle } from 'lucide-react';
import Page from '@/components/layout/Page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type DsrAdminAccessGateProps = {
  hasOrganization: boolean;
  canManageDsr: boolean;
  noOrganizationDescription: string;
  restrictedDescription: string;
  children: React.ReactNode;
};

export function DsrAdminAccessGate({
  hasOrganization,
  canManageDsr,
  noOrganizationDescription,
  restrictedDescription,
  children,
}: DsrAdminAccessGateProps) {
  if (!hasOrganization) {
    return (
      <Page maxWidth="7xl" padding="responsive">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Organization Selected</AlertTitle>
          <AlertDescription>{noOrganizationDescription}</AlertDescription>
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
          <AlertDescription>{restrictedDescription}</AlertDescription>
        </Alert>
      </Page>
    );
  }

  return <>{children}</>;
}
