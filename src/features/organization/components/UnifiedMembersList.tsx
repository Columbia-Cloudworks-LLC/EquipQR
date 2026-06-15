/**
 * Unified Members List Component
 *
 * This component displays organization members and invitations in a unified view.
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { UserPlus, Users } from 'lucide-react';

import { useOrganizationInvitations, useResendInvitation, useCancelInvitation } from '@/features/organization/hooks/useOrganizationInvitations';
import { useUpdateMemberRole, useRemoveMember } from '@/features/organization/hooks/useOrganizationMembers';
import { useRequestWorkspaceMerge } from '@/features/organization/hooks/useWorkspacePersonalOrgMerge';
import { useGoogleWorkspaceMemberClaims, useRevokeGoogleWorkspaceMemberClaim } from '@/features/organization/hooks/useGoogleWorkspaceMemberClaims';
import { useGoogleWorkspaceConnectionStatus } from '@/features/organization/hooks/useGoogleWorkspaceConnectionStatus';
import { useUpdateQuickBooksPermission } from '@/hooks/useQuickBooksAccess';
import { useAuth } from '@/hooks/useAuth';
import { GoogleWorkspaceMemberImportSheet } from './GoogleWorkspaceMemberImportSheet';
import type { OrganizationMember } from '@/features/organization/types/organization';
import { SimplifiedInvitationDialog } from './SimplifiedInvitationDialog';
import { toast } from 'sonner';
import { isQuickBooksEnabled } from '@/lib/flags';
import { buildUnifiedMembers } from '@/features/organization/utils/buildUnifiedMembers';
import { UnifiedMembersDesktopTable } from '@/features/organization/components/UnifiedMembersDesktopTable';
import { UnifiedMembersMobileList } from '@/features/organization/components/UnifiedMembersMobileList';

// Re-export type for backward compatibility
export type RealOrganizationMember = OrganizationMember;
export type { UnifiedMember } from '@/features/organization/utils/buildUnifiedMembers';

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
  canInviteMembers,
}) => {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [importSheetOpen, setImportSheetOpen] = useState(false);

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

  const unifiedMembers = useMemo(
    () => buildUnifiedMembers({ members, invitations, gwsClaims }),
    [members, invitations, gwsClaims],
  );

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

  const handleRequestDataMerge = (member: { userId?: string }) => {
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

  const memberListProps = {
    unifiedMembers,
    canManageMembers,
    currentUserId: user?.id,
    resendPending: resendInvitation.isPending,
    cancelPending: cancelInvitation.isPending,
    removePending: removeMember.isPending,
    revokeGwsPending: revokeGwsClaim.isPending,
    mergePending: requestWorkspaceMerge.isPending,
    onRoleChange: handleRoleChange,
    onResendInvitation: handleResendInvitation,
    onCancelInvitation: handleCancelInvitation,
    onRevokeGwsClaim: handleRevokeGwsClaim,
    onRequestDataMerge: handleRequestDataMerge,
    onRemoveMember: handleRemoveMember,
  };

  return (
    <Card>
      <CardHeader className="pb-3 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle className="text-base sm:text-lg">
            Team roster ({unifiedMembers.length})
          </CardTitle>
          {canInviteMembers && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              {isGwsConnected && (
                <Button
                  onClick={() => setImportSheetOpen(true)}
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto justify-center"
                >
                  <Users className="h-4 w-4 sm:mr-2" />
                  Import from Google
                </Button>
              )}
              <Button
                onClick={() => setInviteDialogOpen(true)}
                size="sm"
                className="w-full sm:w-auto justify-center"
              >
                <UserPlus className="h-4 w-4 sm:mr-2" />
                Invite Member
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {unifiedMembers.length === 0 ? (
          <div className="text-center py-8 px-2">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-sm font-semibold mb-1">No members yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {canInviteMembers
                ? 'Invite members to start building your team.'
                : 'No members in this organization yet.'
              }
            </p>
            {canInviteMembers && (
              <div className="flex flex-col gap-2 max-w-sm mx-auto sm:flex-row sm:justify-center">
                {isGwsConnected && (
                  <Button onClick={() => setImportSheetOpen(true)} variant="outline" className="w-full sm:w-auto">
                    <Users className="h-4 w-4 mr-2" />
                    Import from Google
                  </Button>
                )}
                <Button onClick={() => setInviteDialogOpen(true)} className="w-full sm:w-auto">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </div>
            )}
          </div>
        ) : (
          <TooltipProvider>
            <UnifiedMembersDesktopTable
              {...memberListProps}
              isOwner={isOwner}
              quickBooksEnabled={quickBooksEnabled}
              quickBooksPending={updateQuickBooksPermission.isPending}
              onQuickBooksToggle={handleQuickBooksToggle}
            />
            <UnifiedMembersMobileList {...memberListProps} />
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
