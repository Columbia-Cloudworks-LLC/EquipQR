
import React from 'react';
import { OrganizationMember } from '@/features/organization/types/organization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MoreHorizontal, Mail, UserMinus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface MembersListProps {
  members: OrganizationMember[];
  currentUserRole: 'owner' | 'admin' | 'member';
  onRoleChange: (memberId: string, newRole: 'admin' | 'member') => void;
  onRemoveMember: (memberId: string) => void;
  onResendInvitation: (memberId: string) => void;
}

const MembersList: React.FC<MembersListProps> = ({
  members,
  currentUserRole,
  onRoleChange,
  onRemoveMember,
  onResendInvitation,
}) => {
  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      default:
        return 'destructive';
    }
  };

  const handleRoleChange = (memberId: string, newRole: string) => {
    if (newRole === 'admin' || newRole === 'member') {
      onRoleChange(memberId, newRole);
      toast({
        title: 'Role Updated',
        description: 'Member role has been successfully updated.',
      });
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    onRemoveMember(memberId);
    toast({
      title: 'Member Removed',
      description: `${memberName} has been removed from the organization.`,
    });
  };

  const handleResendInvitation = (memberId: string, memberName: string) => {
    onResendInvitation(memberId);
    toast({
      title: 'Invitation Sent',
      description: `Invitation has been resent to ${memberName}.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Members ({members.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center space-x-4">
                <Avatar>
                  {member.avatar && <AvatarImage src={member.avatar} alt={member.name} />}
                  <AvatarFallback>
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{member.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Joined {new Date(member.joinedDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant={getStatusBadgeVariant(member.status)}>
                  {member.status}
                </Badge>
                
                {canManageMembers && member.role !== 'owner' ? (
                  <Select
                    value={member.role}
                    onValueChange={(value) => handleRoleChange(member.id, value)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    {member.role}
                  </Badge>
                )}

                {canManageMembers && member.role !== 'owner' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {member.status === 'pending' && (
                        <DropdownMenuItem
                          onClick={() => handleResendInvitation(member.id, member.name)}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Resend Invitation
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleRemoveMember(member.id, member.name)}
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MembersList;

