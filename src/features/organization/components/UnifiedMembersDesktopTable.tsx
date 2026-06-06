import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UnifiedMemberAvatar } from '@/features/organization/components/UnifiedMemberAvatar';
import { UnifiedMemberRowActions } from '@/features/organization/components/UnifiedMemberRowActions';
import type { UnifiedMember } from '@/features/organization/utils/buildUnifiedMembers';
import {
  getStatusBadgeVariant,
  getStatusIcon,
  getStatusLabel,
} from '@/features/organization/utils/unifiedMemberPresentation';
import { getRoleBadgeVariant } from '@/utils/badgeVariants';

const thClass = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground';

type UnifiedMembersDesktopTableProps = {
  unifiedMembers: UnifiedMember[];
  canManageMembers: boolean;
  isOwner: boolean;
  quickBooksEnabled: boolean;
  currentUserId?: string;
  resendPending: boolean;
  cancelPending: boolean;
  removePending: boolean;
  revokeGwsPending: boolean;
  mergePending: boolean;
  quickBooksPending: boolean;
  onRoleChange: (memberId: string, newRole: 'admin' | 'member') => void;
  onQuickBooksToggle: (userId: string, canManage: boolean) => void;
  onResendInvitation: (invitationId: string) => void;
  onCancelInvitation: (invitationId: string) => void;
  onRevokeGwsClaim: (claimId: string) => void;
  onRequestDataMerge: (member: UnifiedMember) => void;
  onRemoveMember: (memberId: string, memberName: string) => void;
};

export function UnifiedMembersDesktopTable({
  unifiedMembers,
  canManageMembers,
  isOwner,
  quickBooksEnabled,
  currentUserId,
  resendPending,
  cancelPending,
  removePending,
  revokeGwsPending,
  mergePending,
  quickBooksPending,
  onRoleChange,
  onQuickBooksToggle,
  onResendInvitation,
  onCancelInvitation,
  onRevokeGwsClaim,
  onRequestDataMerge,
  onRemoveMember,
}: UnifiedMembersDesktopTableProps) {
  return (
    <div className="hidden sm:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={thClass}>Member</TableHead>
            <TableHead className={thClass}>Email</TableHead>
            <TableHead className={thClass}>Role</TableHead>
            <TableHead className={thClass}>Status</TableHead>
            {isOwner && quickBooksEnabled && (
              <TableHead className={thClass}>
                <Tooltip>
                  <TooltipTrigger className="cursor-help uppercase">QuickBooks</TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Allow admin to manage QuickBooks integration (connect, disconnect, export invoices)</p>
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
                <TableCell className="py-3">
                  {member.type === 'member' && member.organizationRole === 'admin' ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Switch
                            checked={member.canManageQuickBooks ?? false}
                            onCheckedChange={(checked) => {
                              if (!member.userId) return;
                              onQuickBooksToggle(member.userId, checked);
                            }}
                            disabled={quickBooksPending}
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
