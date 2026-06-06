import { Database, Mail, MoreHorizontal, UserMinus, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { UnifiedMember } from '@/features/organization/utils/buildUnifiedMembers';

type UnifiedMemberRowActionsProps = {
  member: UnifiedMember;
  canManageMembers: boolean;
  currentUserId?: string;
  resendPending: boolean;
  cancelPending: boolean;
  removePending: boolean;
  revokeGwsPending: boolean;
  mergePending: boolean;
  onResendInvitation: (invitationId: string) => void;
  onCancelInvitation: (invitationId: string) => void;
  onRevokeGwsClaim: (claimId: string) => void;
  onRequestDataMerge: (member: UnifiedMember) => void;
  onRemoveMember: (memberId: string, memberName: string) => void;
};

export function UnifiedMemberRowActions({
  member,
  canManageMembers,
  currentUserId,
  resendPending,
  cancelPending,
  removePending,
  revokeGwsPending,
  mergePending,
  onResendInvitation,
  onCancelInvitation,
  onRevokeGwsClaim,
  onRequestDataMerge,
  onRemoveMember,
}: UnifiedMemberRowActionsProps) {
  if (!canManageMembers || member.organizationRole === 'owner') return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Member options">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {member.type === 'invitation' && (
          <>
            <DropdownMenuItem
              onClick={() => onResendInvitation(member.id)}
              disabled={resendPending}
            >
              <Mail className="h-4 w-4 mr-2" />
              Resend Invitation
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onCancelInvitation(member.id)}
              disabled={cancelPending}
              className="text-destructive"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Invitation
            </DropdownMenuItem>
          </>
        )}
        {member.type === 'gws_claim' && (
          <DropdownMenuItem
            onClick={() => onRevokeGwsClaim(member.id)}
            disabled={revokeGwsPending}
            className="text-destructive"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Remove Pending Member
          </DropdownMenuItem>
        )}
        {member.type === 'member' && (
          <>
            <DropdownMenuItem
              onClick={() => onRequestDataMerge(member)}
              disabled={mergePending || member.userId === currentUserId}
            >
              <Database className="mr-2 h-4 w-4" />
              Request Data Merge
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onRemoveMember(member.id, member.name)}
              disabled={removePending}
            >
              <UserMinus className="mr-2 h-4 w-4" />
              Remove Member
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
