import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnifiedMemberPermissionRows } from '@/features/organization/components/UnifiedMemberPermissionRows';
import { UnifiedMemberAvatar } from '@/features/organization/components/UnifiedMemberAvatar';
import { UnifiedMemberRowActions } from '@/features/organization/components/UnifiedMemberRowActions';
import type { UnifiedMembersListViewProps } from '@/features/organization/components/unifiedMembersListViewProps';
import {
  getUnifiedMemberStatusBadgeVariant,
  getStatusIcon,
  getStatusLabel,
} from '@/features/organization/utils/unifiedMemberPresentation';
import { getRoleBadgeVariant } from '@/utils/badgeVariants';

export function UnifiedMembersMobileList({
  unifiedMembers,
  canManageMembers,
  currentUserId,
  resendPending,
  cancelPending,
  removePending,
  revokeGwsPending,
  mergePending,
  permissionContext,
  partsManagerUserIds,
  partsConsumerUserIds,
  quickBooksPending,
  partsManagerPending,
  partsConsumerPending,
  onRoleChange,
  onQuickBooksToggle,
  onPartsManagerToggle,
  onPartsConsumerToggle,
  onResendInvitation,
  onCancelInvitation,
  onRevokeGwsClaim,
  onRequestDataMerge,
  onRemoveMember,
}: UnifiedMembersListViewProps) {
  return (
    <div className="sm:hidden space-y-3">
      {unifiedMembers.map((member) => (
        <div key={member.id} className="rounded-lg border p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <UnifiedMemberAvatar member={member} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{member.name}</p>
                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={getUnifiedMemberStatusBadgeVariant(member.status)} className="capitalize text-xs">
                <div className="flex items-center gap-1">
                  {getStatusIcon(member.status)}
                  {getStatusLabel(member.status)}
                </div>
              </Badge>
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
          </div>
          <UnifiedMemberPermissionRows
            member={member}
            context={permissionContext}
            isPartsManager={member.userId ? partsManagerUserIds.has(member.userId) : false}
            isPartsConsumer={member.userId ? partsConsumerUserIds.has(member.userId) : false}
            quickBooksPending={quickBooksPending}
            partsManagerPending={partsManagerPending}
            partsConsumerPending={partsConsumerPending}
            onQuickBooksToggle={onQuickBooksToggle}
            onPartsManagerToggle={onPartsManagerToggle}
            onPartsConsumerToggle={onPartsConsumerToggle}
            layout="mobile"
          />
        </div>
      ))}
    </div>
  );
}
