import type { OrganizationMember } from '@/features/organization/types/organization';
import type { OrganizationInvitation } from '@/features/organization/hooks/useOrganizationInvitations';
import type { GoogleWorkspaceMemberClaim } from '@/features/organization/hooks/useGoogleWorkspaceMemberClaims';

export interface UnifiedMember {
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

type BuildUnifiedMembersInput = {
  members: OrganizationMember[];
  invitations: Pick<OrganizationInvitation, 'id' | 'email' | 'role' | 'status' | 'createdAt'>[];
  gwsClaims: GoogleWorkspaceMemberClaim[];
};

/**
 * Combines active members, pending invitations, and GWS claims into a unified sorted list.
 */
export function buildUnifiedMembers({
  members,
  invitations,
  gwsClaims,
}: BuildUnifiedMembersInput): UnifiedMember[] {
  const activeMembers: UnifiedMember[] = members.map((member) => ({
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
    .filter((inv) => inv.status === 'pending')
    .map((invitation) => ({
      id: invitation.id,
      name: 'Pending Invite',
      email: invitation.email,
      organizationRole: invitation.role as 'owner' | 'admin' | 'member',
      status: 'pending_invite' as const,
      invitedDate: invitation.createdAt,
      type: 'invitation' as const,
    }));

  const existingEmails = new Set([
    ...activeMembers.map((m) => m.email.toLowerCase()),
    ...pendingInvitations.map((i) => i.email.toLowerCase()),
  ]);

  const pendingGwsClaims: UnifiedMember[] = gwsClaims
    .filter((claim) => !existingEmails.has(claim.email.toLowerCase()))
    .map((claim) => ({
      id: claim.id,
      name: claim.fullName || 'Pending (Google Workspace)',
      email: claim.email,
      organizationRole: 'member' as const,
      status: 'pending_gws' as const,
      invitedDate: claim.createdAt,
      type: 'gws_claim' as const,
    }));

  return [...activeMembers, ...pendingInvitations, ...pendingGwsClaims].sort((a, b) => {
    const statusOrder = { active: 0, pending_invite: 1, pending_gws: 2 };
    if (a.status !== b.status) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    const isPendingA = a.name.startsWith('Pending');
    const isPendingB = b.name.startsWith('Pending');
    if (isPendingA && !isPendingB) return 1;
    if (!isPendingA && isPendingB) return -1;
    return a.name.localeCompare(b.name);
  });
}
