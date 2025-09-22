
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Settings } from 'lucide-react';
import { FleetMapSubscription } from '@/hooks/useFleetMapSubscription';
import { OrganizationSettings } from './OrganizationSettings';
import UnifiedMembersList from './UnifiedMembersList';
import { useSlotAvailability } from '@/hooks/useOrganizationSlots';

interface MemberItem {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending' | 'inactive';
  joinedDate: string;
  avatar?: string;
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
  const { data: slotAvailability } = useSlotAvailability(organizationId);

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
        <UnifiedMembersList
          members={members}
          organizationId={organizationId}
          currentUserRole={currentUserRole}
          isLoading={membersLoading}
          canInviteMembers={!!permissions?.canInviteMembers}
          slotAvailability={slotAvailability}
        />

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
      </TabsContent>

      <TabsContent value="settings">
        <OrganizationSettings organizationId={organizationId} currentUserRole={currentUserRole} />
      </TabsContent>
    </Tabs>
  );
};

export default OrganizationTabs;
