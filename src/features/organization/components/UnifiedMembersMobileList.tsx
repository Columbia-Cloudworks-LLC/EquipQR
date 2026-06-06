import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnifiedMemberAvatar } from '@/features/organization/components/UnifiedMemberAvatar';
import { UnifiedMemberRowActions } from '@/features/organization/components/UnifiedMemberRowActions';
import type { UnifiedMember } from '@/features/organization/utils/buildUnifiedMembers';
import {
  getUnifiedMemberStatusBadgeVariant,
  getStatusIcon,
  getStatusLabel,
} from '@/features/organization/utils/unifiedMemberPresentation';
import { getRoleBadgeVariant } from '@/utils/badgeVariants';

type UnifiedMembersMobileListProps = {
  unifiedMembers: UnifiedMember[];
  canManageMembers: boolean;
  currentUserId?: string;
  resendPending: boolean;
  cancelPending: boolean;
  removePending: boolean;
  revokeGwsPending: boolean;
  mergePending: boolean;
  onRoleChange: (memberId: string, newRole: 'admin' | 'member') => void;
  onResendInvitation: (invitationId: string) => void;
  onCancelInvitation: (invitationId: string) => void;
  onRevokeGwsClaim: (claimId: string) => void;
  onRequestDataMerge: (member: UnifiedMember) => void;
  onRemoveMember: (memberId: string, memberName: string) => void;
};

export function UnifiedMembersMobileList({
  unifiedMembers,
  canManageMembers,
  currentUserId,
  resendPending,
  cancelPending,
  removePending,
  revokeGwsPending,
  mergePending,
  onRoleChange,
  onResendInvitation,
  onCancelInvitation,
  onRevokeGwsClaim,
  onRequestDataMerge,
  onRemoveMember,
}: UnifiedMembersMobileListProps) {
  return (
    <div className="sm:hidden space-y-3">
      {unifiedMembers.map((member) => (
        <div key={member.id} className="rounded-lg border p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <UnifiedMemberAvatar member={member} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{member.name}</p>
                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
              </div>
            </div>
            <UnifiedMemberRowActions
              member={member}
              canManageMembers={canManageMembers}
              currentUserId={currentUserId}
              resendPending={resendPending}
              cancelPending={cancelPending}
              removePending={removePending}
              revokeGwsPending={revokeGwsPending}
              mergePending={mergePending}
              onResendInvitation={onResendInvitation}
              onCancelInvitation={onCancelInvitation}
              onRevokeGwsClaim={onRevokeGwsClaim}
              onRequestDataMerge={onRequestDataMerge}
              onRemoveMember={onRemoveMember}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canManageMembers && member.organizationRole !== 'owner' && member.type === 'member' ? (
              <Select
                value={member.organizationRole}
                onValueChange={(value) => onRoleChange(member.id, value as 'admin' | 'member')}
              >
                <SelectTrigger className="w-24 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge variant={getRoleBadgeVariant(member.organizationRole)} className="capitalize text-xs">
                {member.organizationRole}
              </Badge>
            )}
            <Badge variant={getUnifiedMemberStatusBadgeVariant(member.status)} className="capitalize text-xs">
              <div className="flex items-center gap-1">
                {getStatusIcon(member.status)}
                {getStatusLabel(member.status)}
              </div>
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
