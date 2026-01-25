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
import { MoreHorizontal, Mail, UserMinus, UserPlus, Users, Clock, CheckCircle, XCircle, Database, CloudCog } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { useOrganizationInvitations, useResendInvitation, useCancelInvitation } from '@/features/organization/hooks/useOrganizationInvitations';
import { useUpdateMemberRole, useRemoveMember } from '@/features/organization/hooks/useOrganizationMembers';
import { useRequestWorkspaceMerge } from '@/features/organization/hooks/useWorkspacePersonalOrgMerge';
import { useGoogleWorkspaceMemberClaims, useRevokeGoogleWorkspaceMemberClaim } from '@/features/organization/hooks/useGoogleWorkspaceMemberClaims';
import { useGoogleWorkspaceConnectionStatus } from '@/features/organization/hooks/useGoogleWorkspaceConnectionStatus';
import { useUpdateQuickBooksPermission } from '@/hooks/useQuickBooksAccess';
import { useAuth } from '@/hooks/useAuth';
import { GoogleWorkspaceMemberImportSheet } from './GoogleWorkspaceMemberImportSheet';
import type { OrganizationMember } from '@/features/organization/types/organization';
import { getRoleBadgeVariant } from '@/utils/badgeVariants';
import { SimplifiedInvitationDialog } from './SimplifiedInvitationDialog';
import { toast } from 'sonner';
import { isQuickBooksEnabled } from '@/lib/flags';

// Re-export type for backward compatibility
export type RealOrganizationMember = OrganizationMember;

interface UnifiedMember {
  id: string;
  userId?: string;
  name: string;
  email: string;
  organizationRole: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending_invite' | 'pending_gws';
  joinedDate?: string;
  invitedDate?: string;
  type: 'member' | 'invitation' | 'gws_claim';
  canManageQuickBooks?: boolean;
}

interface UnifiedMembersListProps {
  members: RealOrganizationMember[];
  organizationId: string;
  currentUserRole: 'owner' | 'admin' | 'member';
  isLoading: boolean;
  canInviteMembers: boolean;
}

const UnifiedMembersList: React.FC<UnifiedMembersListProps> = ({
  members,
  organizationId,
  currentUserRole,
  isLoading,
  canInviteMembers
}) => {
  
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [importSheetOpen, setImportSheetOpen] = useState(false);
  
  // Check if Google Workspace is connected to show import button
  // Only query when user can invite members to avoid unnecessary network calls
  const { isConnected: isGwsConnected, domain: gwsDomain } = useGoogleWorkspaceConnectionStatus({
    organizationId,
    enabled: canInviteMembers,
  });
  
  const { data: invitations = [] } = useOrganizationInvitations(organizationId);
  const { data: gwsClaims = [] } = useGoogleWorkspaceMemberClaims(organizationId);
  const resendInvitation = useResendInvitation(organizationId);
  const cancelInvitation = useCancelInvitation(organizationId);
  const updateMemberRole = useUpdateMemberRole(organizationId);
  const removeMember = useRemoveMember(organizationId);
  const revokeGwsClaim = useRevokeGoogleWorkspaceMemberClaim(organizationId);
  const updateQuickBooksPermission = useUpdateQuickBooksPermission(organizationId);
  const requestWorkspaceMerge = useRequestWorkspaceMerge();
  const { user } = useAuth();

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';
  const isOwner = currentUserRole === 'owner';
  const quickBooksEnabled = isQuickBooksEnabled();

  // Combine members, pending invitations, and GWS claims into unified list
  const unifiedMembers: UnifiedMember[] = useMemo(() => {
    // Note: we currently do not have per-user team membership data available in this component.
    // We cannot accurately count or display team memberships for organization members.
    // For now, we don't display team counts since we don't have the necessary data.
    // TODO: If team counts are reintroduced, add a query to fetch team counts per organization member.
    const activeMembers: UnifiedMember[] = members.map(member => ({
      id: member.id,
      userId: member.userId || member.id,
      name: member.name || 'Unknown',
      email: member.email || '',
      organizationRole: member.role as 'owner' | 'admin' | 'member',
      status: 'active' as const,
      joinedDate: member.joinedDate,
      type: 'member' as const,
      canManageQuickBooks: member.canManageQuickBooks,
    }));

    const pendingInvitations: UnifiedMember[] = invitations
      .filter(inv => inv.status === 'pending')
      .map(invitation => ({
        id: invitation.id,
        name: 'Pending Invite',
        email: invitation.email,
        organizationRole: invitation.role as 'owner' | 'admin' | 'member',
        status: 'pending_invite' as const,
        invitedDate: invitation.createdAt,
        type: 'invitation' as const
      }));

    // Get emails of active members and pending invites to filter out GWS claims
    const existingEmails = new Set([
      ...activeMembers.map(m => m.email.toLowerCase()),
      ...pendingInvitations.map(i => i.email.toLowerCase()),
    ]);

    // Add pending GWS claims (users selected from Google Workspace who haven't signed up yet)
    const pendingGwsClaims: UnifiedMember[] = gwsClaims
      .filter(claim => !existingEmails.has(claim.email.toLowerCase()))
      .map(claim => ({
        id: claim.id,
        name: claim.fullName || 'Pending (Google Workspace)',
        email: claim.email,
        organizationRole: 'member' as const, // GWS-selected users start as members
        status: 'pending_gws' as const,
        invitedDate: claim.createdAt,
        type: 'gws_claim' as const,
      }));

    // Sort by status (active first, then pending invite, then pending GWS), then by name
    return [...activeMembers, ...pendingInvitations, ...pendingGwsClaims].sort((a, b) => {
      const statusOrder = { active: 0, pending_invite: 1, pending_gws: 2 };
      if (a.status !== b.status) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      // Sort pending items to the end within their group
      const isPendingA = a.name.startsWith('Pending');
      const isPendingB = b.name.startsWith('Pending');
      if (isPendingA && !isPendingB) return 1;
      if (!isPendingA && isPendingB) return -1;
      return a.name.localeCompare(b.name);
    });
  }, [members, invitations, gwsClaims]);

  const getStatusIcon = (status: UnifiedMember['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending_invite':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'pending_gws':
        return <CloudCog className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadgeVariant = (status: UnifiedMember['status']) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending_invite':
        return 'secondary';
      case 'pending_gws':
        return 'outline';
    }
  };

  const getStatusLabel = (status: UnifiedMember['status']) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'pending_invite':
        return 'Pending Invite';
      case 'pending_gws':
        return 'Awaiting Sign-up';
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

  const handleRevokeGwsClaim = async (claimId: string) => {
    try {
      await revokeGwsClaim.mutateAsync(claimId);
    } catch {
      // Error already handled by mutation
    }
  };

  const handleQuickBooksToggle = async (userId: string, canManage: boolean) => {
    await updateQuickBooksPermission.mutateAsync({
      targetUserId: userId,
      canManageQuickBooks: canManage,
    });
  };

  const handleRequestDataMerge = (member: UnifiedMember) => {
    if (!member.userId) {
      return;
    }

    requestWorkspaceMerge.mutate({
      workspaceOrgId: organizationId,
      targetUserId: member.userId,
    });
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
          </div>
          {canInviteMembers && (
            <div className="flex items-center gap-2">
              {isGwsConnected && (
                <Button onClick={() => setImportSheetOpen(true)} size="sm" variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  Import from Google
                </Button>
              )}
              <Button onClick={() => setInviteDialogOpen(true)} size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </div>
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
          <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                {isOwner && quickBooksEnabled && (
                  <TableHead>
                    <Tooltip>
                      <TooltipTrigger className="cursor-help">QuickBooks</TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Allow admin to manage QuickBooks integration (connect, disconnect, export invoices)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                )}
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
                          {member.name === 'Pending Invite' || member.name === 'Pending (Google Workspace)'
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
                            {member.type === 'gws_claim' ? 'Added' : 'Invited'} {new Date(member.invitedDate).toLocaleDateString()}
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
                    {member.status === 'pending_gws' ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant={getStatusBadgeVariant(member.status)} className="capitalize cursor-help">
                            <div className="flex items-center gap-1">
                              {getStatusIcon(member.status)}
                              {getStatusLabel(member.status)}
                            </div>
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Selected from Google Workspace. They will be automatically added when they sign up with their Google account.</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Badge variant={getStatusBadgeVariant(member.status)} className="capitalize">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(member.status)}
                          {getStatusLabel(member.status)}
                        </div>
                      </Badge>
                    )}
                  </TableCell>
                  {isOwner && quickBooksEnabled && (
                    <TableCell>
                      {member.type === 'member' && member.organizationRole === 'admin' ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Switch
                                checked={member.canManageQuickBooks ?? false}
                                onCheckedChange={(checked) => {
                                  if (!member.userId) {
                                    return;
                                  }
                                  handleQuickBooksToggle(member.userId, checked);
                                }}
                                disabled={updateQuickBooksPermission.isPending}
                                aria-label="Toggle QuickBooks management permission"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{member.canManageQuickBooks ? 'Revoke QuickBooks access' : 'Grant QuickBooks access'}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : member.organizationRole === 'owner' ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-xs text-muted-foreground italic">Always</div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Owners always have QuickBooks management permission</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
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
                            {member.type === 'gws_claim' && (
                              <DropdownMenuItem
                                onClick={() => handleRevokeGwsClaim(member.id)}
                                disabled={revokeGwsClaim.isPending}
                                className="text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Remove Pending Member
                              </DropdownMenuItem>
                            )}
                            {member.type === 'member' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleRequestDataMerge(member)}
                                  disabled={requestWorkspaceMerge.isPending || member.userId === user?.id}
                                >
                                  <Database className="mr-2 h-4 w-4" />
                                  Request Data Merge
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleRemoveMember(member.id, member.name)}
                                  disabled={removeMember.isPending}
                                >
                                  <UserMinus className="mr-2 h-4 w-4" />
                                  Remove Member
                                </DropdownMenuItem>
                              </>
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
          </TooltipProvider>
        )}

        <SimplifiedInvitationDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
        />

        {isGwsConnected && importSheetOpen && (
          <GoogleWorkspaceMemberImportSheet
            open={importSheetOpen}
            onOpenChange={setImportSheetOpen}
            organizationId={organizationId}
            domain={gwsDomain}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default UnifiedMembersList;
