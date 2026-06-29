import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  UnifiedMemberPartsConsumerControl,
  UnifiedMemberPartsManagerControl,
  UnifiedMemberQuickBooksControl,
} from '@/features/organization/components/UnifiedMemberPermissionRows';
import { PartsConsumerMarkIcon } from '@/components/icons/PartsConsumerMarkIcon';
import { PartsManagerMarkIcon } from '@/components/icons/PartsManagerMarkIcon';
import { QuickBooksMarkIcon } from '@/components/icons/QuickBooksMarkIcon';
import { UnifiedMemberAvatar } from '@/features/organization/components/UnifiedMemberAvatar';
import { UnifiedMemberRowActions } from '@/features/organization/components/UnifiedMemberRowActions';
import type { UnifiedMembersListViewProps } from '@/features/organization/components/unifiedMembersListViewProps';
import {
  getUnifiedMemberStatusBadgeVariant,
  getStatusIcon,
  getStatusLabel,
} from '@/features/organization/utils/unifiedMemberPresentation';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { getRoleBadgeVariant } from '@/utils/badgeVariants';

const thClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground';

export function UnifiedMembersDesktopTable({
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
  const { formatDate } = useFormatTimestamp();
  const { isOwner, quickBooksEnabled, canManagePartsManagers, canManagePartsConsumers } =
    permissionContext;
  const showQuickBooksColumn = isOwner && quickBooksEnabled;
  const showPartsManagerColumn = canManagePartsManagers;
  const showPartsConsumerColumn = canManagePartsConsumers;

  return (
    <div className="hidden sm:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={thClass}>Member</TableHead>
            <TableHead className={thClass}>Email</TableHead>
            <TableHead className={thClass}>Role</TableHead>
            <TableHead className={thClass}>Status</TableHead>
            {showQuickBooksColumn && (
              <TableHead className={thClass}>
                <Tooltip>
                  <TooltipTrigger className="cursor-help inline-flex items-center gap-1.5 uppercase">
                    <QuickBooksMarkIcon />
                    QuickBooks
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Allow admin to manage QuickBooks integration (connect, disconnect, export invoices)</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
            )}
            {showPartsManagerColumn && (
              <TableHead className={thClass}>
                <Tooltip>
                  <TooltipTrigger className="cursor-help inline-flex items-center gap-1.5 uppercase">
                    <PartsManagerMarkIcon />
                    Parts Manager
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Allow member to create, edit, and manage inventory items</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
            )}
            {showPartsConsumerColumn && (
              <TableHead className={thClass}>
                <Tooltip>
                  <TooltipTrigger className="cursor-help inline-flex items-center gap-1.5 uppercase">
                    <PartsConsumerMarkIcon />
                    Parts Consumer
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Allow member to view inventory, part lookup, and alternate groups</p>
                  </TooltipContent>
                </Tooltip>
              </TableHead>
            )}
            {canManageMembers && <TableHead className={`${thClass} text-right`}>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {unifiedMembers.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="py-3">
                <div className="flex items-center gap-3">
                  <UnifiedMemberAvatar member={member} />
                  <div>
                    <div className="text-sm font-medium">{member.name}</div>
                    {member.joinedDate && (
                      <div className="text-xs text-muted-foreground">
                        Joined {formatDate(member.joinedDate)}
                      </div>
                    )}
                    {member.invitedDate && (
                      <div className="text-xs text-muted-foreground">
                        {member.type === 'gws_claim' ? 'Added' : 'Invited'} {formatDate(member.invitedDate)}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-3 font-mono text-sm">{member.email}</TableCell>
              <TableCell className="py-3">
                {canManageMembers && member.organizationRole !== 'owner' && member.type === 'member' ? (
                  <Select
                    value={member.organizationRole}
                    onValueChange={(value) => onRoleChange(member.id, value as 'admin' | 'member')}
                  >
                    <SelectTrigger className="w-24 h-8">
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
              <TableCell className="py-3">
                {member.status === 'pending_gws' ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant={getUnifiedMemberStatusBadgeVariant(member.status)} className="capitalize cursor-help">
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
                  <Badge variant={getUnifiedMemberStatusBadgeVariant(member.status)} className="capitalize">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(member.status)}
                      {getStatusLabel(member.status)}
                    </div>
                  </Badge>
                )}
              </TableCell>
              {showQuickBooksColumn && (
                <TableCell className="py-3">
                  <UnifiedMemberQuickBooksControl
                    member={member}
                    context={permissionContext}
                    quickBooksPending={quickBooksPending}
                    onQuickBooksToggle={onQuickBooksToggle}
                    layout="desktop"
                  />
                </TableCell>
              )}
              {showPartsManagerColumn && (
                <TableCell className="py-3">
                  <UnifiedMemberPartsManagerControl
                    member={member}
                    context={permissionContext}
                    isPartsManager={member.userId ? partsManagerUserIds.has(member.userId) : false}
                    partsManagerPending={partsManagerPending}
                    onPartsManagerToggle={onPartsManagerToggle}
                    layout="desktop"
                  />
                </TableCell>
              )}
              {showPartsConsumerColumn && (
                <TableCell className="py-3">
                  <UnifiedMemberPartsConsumerControl
                    member={member}
                    context={permissionContext}
                    isPartsConsumer={member.userId ? partsConsumerUserIds.has(member.userId) : false}
                    partsConsumerPending={partsConsumerPending}
                    onPartsConsumerToggle={onPartsConsumerToggle}
                    layout="desktop"
                  />
                </TableCell>
              )}
              {canManageMembers && (
                <TableCell className="py-3 text-right">
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
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
