
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface OrganizationSettingsProps {
  organizationId: string;
  currentUserRole: 'owner' | 'admin' | 'member';
}

export const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({
  organizationId: _organizationId,
  currentUserRole: _currentUserRole,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Settings</CardTitle>
        <CardDescription>
          Configure your organization preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Organization settings will be available here.
        </p>
      </CardContent>
    </Card>
  );
};
