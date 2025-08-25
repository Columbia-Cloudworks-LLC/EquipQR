
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RealOrganizationMember } from '@/hooks/useOptimizedOrganizationMembers';

interface MemberManagementProps {
  members: RealOrganizationMember[];
  organizationId: string;
  currentUserRole: 'owner' | 'admin' | 'member';
  isLoading?: boolean;
}

export const MemberManagement: React.FC<MemberManagementProps> = ({
  members,
  organizationId,
  currentUserRole,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Loading members...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>
          Manage your organization members and their roles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{member.name || member.email}</p>
                <p className="text-sm text-muted-foreground">{member.email}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                {member.role}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
