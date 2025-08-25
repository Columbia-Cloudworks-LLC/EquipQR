
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Settings } from 'lucide-react';
import { FleetMapSubscription } from '@/hooks/useFleetMapSubscription';
import { SimplifiedInvitationDialog } from './SimplifiedInvitationDialog';
import { MemberManagement } from './MemberManagement';
import { OrganizationSettings } from './OrganizationSettings';

interface MemberItem {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

interface Permissions {
  canInviteMembers?: boolean;
}

interface OrganizationTabsProps {
  members: MemberItem[];
  organizationId: string;
  currentUserRole: 'owner' | 'admin' | 'member';
  permissions: Permissions;
  membersLoading: boolean;
  fleetMapSubscription?: FleetMapSubscription;
}

const OrganizationTabs: React.FC<OrganizationTabsProps> = ({
  members,
  organizationId,
  currentUserRole,
  permissions,
  membersLoading,
  fleetMapSubscription
}) => {
  const [invitationDialogOpen, setInvitationDialogOpen] = useState(false);

  return (
    <Tabs defaultValue="members" className="space-y-4">
      <TabsList>
        <TabsTrigger value="members" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Members
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </TabsTrigger>
      </TabsList>

      <TabsContent value="members" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Manage your organization's team members and their roles
                </CardDescription>
              </div>
              {permissions?.canInviteMembers && (
                <Button
                  onClick={() => setInvitationDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Invite Member
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <MemberManagement
              members={members}
              organizationId={organizationId}
              currentUserRole={currentUserRole}
              isLoading={membersLoading}
            />
          </CardContent>
        </Card>

        {fleetMapSubscription && (
          <Card>
            <CardHeader>
              <CardTitle>Premium Features</CardTitle>
              <CardDescription>Active premium features for your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Fleet Map</h4>
                  <p className="text-sm text-muted-foreground">
                    Visualize equipment locations on an interactive map
                  </p>
                </div>
                <Badge variant={fleetMapSubscription.active ? 'default' : 'secondary'}>
                  {fleetMapSubscription.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <SimplifiedInvitationDialog
          open={invitationDialogOpen}
          onOpenChange={setInvitationDialogOpen}
        />
      </TabsContent>

      <TabsContent value="settings">
        <OrganizationSettings organizationId={organizationId} currentUserRole={currentUserRole} />
      </TabsContent>
    </Tabs>
  );
};

export default OrganizationTabs;
