import type { UnifiedMember } from '@/features/organization/utils/buildUnifiedMembers';
import type { UnifiedMemberPermissionContext } from '@/features/organization/utils/unifiedMemberPermissionRules';

export type UnifiedMembersListViewProps = {
  unifiedMembers: UnifiedMember[];
  canManageMembers: boolean;
  currentUserId?: string;
  resendPending: boolean;
  cancelPending: boolean;
  removePending: boolean;
  revokeGwsPending: boolean;
  mergePending: boolean;
  permissionContext: UnifiedMemberPermissionContext;
  partsManagerUserIds: Set<string>;
  partsConsumerUserIds: Set<string>;
  quickBooksPending: boolean;
  partsManagerPending: boolean;
  partsConsumerPending: boolean;
  onRoleChange: (memberId: string, newRole: 'admin' | 'member') => void;
  onQuickBooksToggle: (userId: string, canManage: boolean) => void;
  onPartsManagerToggle: (userId: string, isPartsManager: boolean) => void;
  onPartsConsumerToggle: (userId: string, isPartsConsumer: boolean) => void;
  onResendInvitation: (invitationId: string) => void;
  onCancelInvitation: (invitationId: string) => void;
  onRevokeGwsClaim: (claimId: string) => void;
  onRequestDataMerge: (member: UnifiedMember) => void;
  onRemoveMember: (memberId: string, memberName: string) => void;
};
