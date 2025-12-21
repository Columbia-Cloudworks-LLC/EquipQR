
import React, { useState } from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, User, Settings, Trash2 } from 'lucide-react';
import { TeamWithMembers } from '@/features/teams/services/teamService';
import { usePermissions } from '@/hooks/usePermissions';
import { useTeamMembers } from '@/features/teams/hooks/useTeamManagement';
import { useOrganization } from '@/contexts/OrganizationContext';
import RoleChangeDialog from './RoleChangeDialog';

interface TeamMembersListProps {
  team: TeamWithMembers;
}

type TeamMemberWithProfile = TeamWithMembers['members'][number];

const TeamMembersList: React.FC<TeamMembersListProps> = ({ team }) => {
  const { currentOrganization } = useOrganization();
  const { removeMember } = useTeamMembers(team.id, currentOrganization?.id);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberWithProfile | null>(null);
  const { canManageTeam } = usePermissions();
  
  const canManage = canManageTeam(team.id);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'manager':
        return <Users className="h-4 w-4 text-blue-600" />;
      case 'technician':
        return <User className="h-4 w-4 text-green-600" />;
      case 'requestor':
        return <User className="h-4 w-4 text-orange-600" />;
      case 'viewer':
        return <User className="h-4 w-4 text-gray-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'technician':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'requestor':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleChangeRole = (member: TeamMemberWithProfile) => {
    setSelectedMember(member);
    setShowRoleDialog(true);
  };

  const handleRemoveMember = async (member: TeamMemberWithProfile) => {
    const memberName = member.profiles?.name || 'this member';
    const confirmed = window.confirm(`Are you sure you want to remove ${memberName} from the team?`);
    
    if (!confirmed) return;

    try {
      await removeMember.mutateAsync({
        teamId: team.id,
        userId: member.user_id
      });
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  // Ensure members array exists and has the expected structure
  const members = team.members || [];

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Email</TableHead>
            {canManage && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                   <Avatar className="h-8 w-8">
                     <AvatarFallback className="text-sm">
                       {(member.profiles?.name || 'U').split(' ').map(n => n[0]).join('')}
                     </AvatarFallback>
                   </Avatar>
                   <div>
                     <p className="font-medium">{member.profiles?.name || 'Unknown'}</p>
                   </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getRoleColor(member.role)} variant="outline">
                  <div className="flex items-center gap-1">
                    {getRoleIcon(member.role)}
                    {member.role}
                  </div>
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground">{member.profiles?.email || 'No email'}</span>
              </TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleChangeRole(member)}
                        className="flex items-center gap-2"
                      >
                        <Users className="h-4 w-4" />
                        Change Role
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleRemoveMember(member)}
                        className="flex items-center gap-2 text-destructive"
                        disabled={removeMember.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        {removeMember.isPending ? 'Removing...' : 'Remove from Team'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {members.length === 0 && (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No team members</h3>
          <p className="text-muted-foreground">
            This team doesn't have any members yet.
          </p>
        </div>
      )}

      <RoleChangeDialog
        open={showRoleDialog}
        onClose={() => setShowRoleDialog(false)}
        member={selectedMember}
        team={team}
      />
    </div>
  );
};

export default TeamMembersList;
