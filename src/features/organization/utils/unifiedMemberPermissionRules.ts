import type { UnifiedMember } from '@/features/organization/utils/buildUnifiedMembers';

export type UnifiedMemberPermissionContext = {
  isOwner: boolean;
  quickBooksEnabled: boolean;
  canManagePartsManagers: boolean;
};

export type QuickBooksPermissionDisplay = 'toggle' | 'always' | 'not-applicable' | 'hidden';
export type PartsManagerPermissionDisplay = 'toggle' | 'not-applicable' | 'hidden';

export function getQuickBooksPermissionDisplay(
  member: UnifiedMember,
  { isOwner, quickBooksEnabled }: UnifiedMemberPermissionContext,
): QuickBooksPermissionDisplay {
  if (!isOwner || !quickBooksEnabled) {
    return 'hidden';
  }

  if (member.organizationRole === 'owner') {
    return 'always';
  }

  if (member.type === 'member' && member.organizationRole === 'admin') {
    return 'toggle';
  }

  return 'not-applicable';
}

export function getPartsManagerPermissionDisplay(
  member: UnifiedMember,
  { canManagePartsManagers }: UnifiedMemberPermissionContext,
): PartsManagerPermissionDisplay {
  if (!canManagePartsManagers) {
    return 'hidden';
  }

  if (
    member.type === 'member' &&
    member.organizationRole === 'member' &&
    member.status === 'active'
  ) {
    return 'toggle';
  }

  return 'not-applicable';
}

export function shouldShowMobilePermissionSection(
  member: UnifiedMember,
  context: UnifiedMemberPermissionContext,
): boolean {
  const quickBooks = getQuickBooksPermissionDisplay(member, context);
  const partsManager = getPartsManagerPermissionDisplay(member, context);

  const showQuickBooks =
    quickBooks === 'toggle' || (quickBooks === 'always' && context.isOwner && context.quickBooksEnabled);
  const showPartsManager = partsManager === 'toggle';

  return showQuickBooks || showPartsManager;
}
