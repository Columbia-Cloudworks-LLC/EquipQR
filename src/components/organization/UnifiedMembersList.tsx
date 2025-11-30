/**
 * Unified Members List Component
 * 
 * This component displays organization members and invitations in a unified view.
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Mail, UserMinus, UserPlus, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { useOrganizationInvitations, useResendInvitation, useCancelInvitation } from '@/hooks/useOrganizationInvitations';
import { useTeamMembership } from '@/hooks/useTeamMembership';
import { useUpdateMemberRole, useRemoveMember } from '@/hooks/useOptimizedOrganizationMembers';
import type { OrganizationMember } from '@/types/organization';
import { getRoleBadgeVariant } from '@/utils/badgeVariants';
import { SimplifiedInvitationDialog } from './SimplifiedInvitationDialog';
import { toast } from 'sonner';
import { type SlotAvailability } from '@/hooks/useOrganizationSlots';
import { shouldBlockInvitation, getSlotStatus } from '@/utils/billing';

// Re-export type for backward compatibility
export type RealOrganizationMember = OrganizationMember;

interface UnifiedMember {
  id: string;
  name: string;
  email: string;
  organizationRole: 'owner' | 'admin' | 'member';
  teamCount: number;
  status: 'active' | 'pending_invite';
  joinedDate?: string;
  invitedDate?: string;
  type: 'member' | 'invitation';
}

interface UnifiedMembersListProps {
  members: RealOrganizationMember[];
  organizationId: string;
  currentUserRole: 'owner' | 'admin' | 'member';
  isLoading: boolean;
  canInviteMembers: boolean;
  slotAvailability?: SlotAvailability;
}

const UnifiedMembersList: React.FC<UnifiedMembersListProps> = ({
  members,
  organizationId,
  currentUserRole,
  isLoading,
  canInviteMembers,
  slotAvailability
}) => {
  
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  
  const { data: invitations = [] } = useOrganizationInvitations(organizationId);
  const { teamMemberships } = useTeamMembership();
  const resendInvitation = useResendInvitation(organizationId);
  const cancelInvitation = useCancelInvitation(organizationId);
  const updateMemberRole = useUpdateMemberRole(organizationId);
  const removeMember = useRemoveMember(organizationId);

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';
  const blockedBySlots = slotAvailability ? shouldBlockInvitation(slotAvailability) : false;
  const slotStatus = slotAvailability ? getSlotStatus(slotAvailability, 1) : undefined;

  // Combine members and pending invitations into unified list
  const unifiedMembers: UnifiedMember[] = useMemo(() => {
    // Get team count for a user
    const getTeamCount = (userId: string) => {
      return teamMemberships.filter(tm => tm.team_id && userId).length;
    };
    const activeMembers: UnifiedMember[] = members.map(member => ({
      id: member.id,
      name: member.name || 'Unknown',
      email: member.email || '',
      organizationRole: member.role as 'owner' | 'admin' | 'member',
      teamCount: getTeamCount(member.id),
      status: 'active' as const,
      joinedDate: member.joinedDate,
      type: 'member' as const
    }));

    const pendingInvitations: UnifiedMember[] = invitations
      .filter(inv => inv.status === 'pending')
      .map(invitation => ({
        id: invitation.id,
        name: 'Pending Invite',
        email: invitation.email,
        organizationRole: invitation.role as 'owner' | 'admin' | 'member',
        teamCount: 0,
        status: 'pending_invite' as const,
        invitedDate: invitation.createdAt,
        type: 'invitation' as const
      }));

    // Sort by status (active first), then by name
    return [...activeMembers, ...pendingInvitations].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'active' ? -1 : 1;
      }
      if (a.name === 'Pending Invite' && b.name !== 'Pending Invite') return 1;
      if (a.name !== 'Pending Invite' && b.name === 'Pending Invite') return -1;
      return a.name.localeCompare(b.name);
    });
  }, [members, invitations, teamMemberships]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending_invite':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending_invite':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'member') => {
    try {
      await updateMemberRole.mutateAsync({ memberId, newRole });
      toast.success('Member role updated successfully');
    } catch {
      toast.error('Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      await removeMember.mutateAsync(memberId);
      toast.success(`${memberName} has been removed from the organization`);
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      await resendInvitation.mutateAsync(invitationId);
      toast.success('Invitation resent successfully');
    } catch {
      toast.error('Failed to resend invitation');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation.mutateAsync(invitationId);
      toast.success('Invitation cancelled successfully');
    } catch {
      toast.error('Failed to cancel invitation');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="text-center py-6 sm:py-8">
            <div className="text-xs sm:text-sm text-muted-foreground">Loading members...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Organization Members ({unifiedMembers.length})
            </CardTitle>
            {slotAvailability && (
              <Badge variant={slotStatus ? slotStatus.variant : 'secondary'} className="ml-1">
                Seats: {slotAvailability.used_slots}/{slotAvailability.total_purchased} • Available {slotAvailability.available_slots}{slotAvailability.exempted_slots ? ` (+${slotAvailability.exempted_slots} exempt)` : ''}
              </Badge>
            )}
          </div>
          {canInviteMembers && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button onClick={() => setInviteDialogOpen(true)} size="sm" disabled={blockedBySlots}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Invite Member
                    </Button>
                  </span>
                </TooltipTrigger>
                {blockedBySlots && (
                  <TooltipContent>
                    No seats available. Purchase more seats to invite.
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {unifiedMembers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No members yet</h3>
            <p className="text-muted-foreground">
              {canInviteMembers 
                ? "Start building your team by inviting members to your organization."
                : "No members in this organization yet."
              }
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>Status</TableHead>
                {canManageMembers && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {unifiedMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {member.name === 'Pending Invite' 
                            ? '?' 
                            : member.name.split(' ').map(n => n[0]).join('').slice(0, 2)
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        {member.joinedDate && (
                          <div className="text-xs text-muted-foreground">
                            Joined {new Date(member.joinedDate).toLocaleDateString()}
                          </div>
                        )}
                        {member.invitedDate && (
                          <div className="text-xs text-muted-foreground">
                            Invited {new Date(member.invitedDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{member.email}</TableCell>
                  <TableCell>
                    {canManageMembers && member.organizationRole !== 'owner' && member.type === 'member' ? (
                      <Select
                        value={member.organizationRole}
                        onValueChange={(value) => handleRoleChange(member.id, value as 'admin' | 'member')}
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
                      <Badge variant={getRoleBadgeVariant(member.organizationRole)} className="capitalize">
                        {member.organizationRole}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {member.teamCount} {member.teamCount === 1 ? 'team' : 'teams'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(member.status)} className="capitalize">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(member.status)}
                        {member.status === 'pending_invite' ? 'Pending' : 'Active'}
                      </div>
                    </Badge>
                  </TableCell>
                  {canManageMembers && (
                    <TableCell className="text-right">
                      {member.organizationRole !== 'owner' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {member.type === 'invitation' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleResendInvitation(member.id)}
                                  disabled={resendInvitation.isPending}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Resend Invitation
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleCancelInvitation(member.id)}
                                  disabled={cancelInvitation.isPending}
                                  className="text-destructive"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel Invitation
                                </DropdownMenuItem>
                              </>
                            )}
                            {member.type === 'member' && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleRemoveMember(member.id, member.name)}
                                disabled={removeMember.isPending}
                              >
                                <UserMinus className="mr-2 h-4 w-4" />
                                Remove Member
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <SimplifiedInvitationDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
        />
      </CardContent>
    </Card>
  );
};

export default UnifiedMembersList;