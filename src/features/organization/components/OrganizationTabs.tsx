
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Settings } from 'lucide-react';
import { OrganizationSettings } from './OrganizationSettings';
import UnifiedMembersList from './UnifiedMembersList';
import { SessionOrganization } from '@/contexts/SessionContext';

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
  organization: SessionOrganization;
}

const OrganizationTabs: React.FC<OrganizationTabsProps> = ({
  members,
  organizationId,
  currentUserRole,
  permissions,
  membersLoading,
  organization
}) => {
  return (
    <Tabs defaultValue="members" className="space-y-6">
      <TabsList className="h-auto bg-transparent p-0 rounded-none border-b w-full justify-start gap-4">
        <TabsTrigger
          value="members"
          className="flex items-center gap-2 rounded-none bg-transparent px-1 pb-2.5 pt-1.5 shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent text-muted-foreground data-[state=active]:text-foreground"
        >
          <Users className="h-4 w-4" />
          Members
        </TabsTrigger>
        <TabsTrigger
          value="settings"
          className="flex items-center gap-2 rounded-none bg-transparent px-1 pb-2.5 pt-1.5 shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent text-muted-foreground data-[state=active]:text-foreground"
        >
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
        />
      </TabsContent>

      <TabsContent value="settings">
        <OrganizationSettings organization={organization} currentUserRole={currentUserRole} />
      </TabsContent>
    </Tabs>
  );
};

export default OrganizationTabs;

