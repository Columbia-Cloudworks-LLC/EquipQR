import { describe, expect, it } from 'vitest';
import type { UnifiedMember } from '@/features/organization/utils/buildUnifiedMembers';
import {
  getPartsConsumerPermissionDisplay,
  getPartsManagerPermissionDisplay,
  getQuickBooksPermissionDisplay,
  shouldShowMobilePermissionSection,
} from '@/features/organization/utils/unifiedMemberPermissionRules';

const activeMember: UnifiedMember = {
  id: 'u-1',
  userId: 'u-1',
  name: 'Bob Member',
  email: 'bob@example.com',
  organizationRole: 'member',
  status: 'active',
  type: 'member',
};

const activeAdmin: UnifiedMember = {
  ...activeMember,
  id: 'u-2',
  userId: 'u-2',
  name: 'Alice Admin',
  organizationRole: 'admin',
};

const ownerContext = {
  isOwner: true,
  quickBooksEnabled: true,
  canManagePartsManagers: true,
  canManagePartsConsumers: true,
};

const adminContext = {
  isOwner: false,
  quickBooksEnabled: true,
  canManagePartsManagers: true,
  canManagePartsConsumers: true,
};

describe('unifiedMemberPermissionRules', () => {
  it('allows QuickBooks toggle for admin members when viewer is owner', () => {
    expect(getQuickBooksPermissionDisplay(activeAdmin, ownerContext)).toBe('toggle');
  });

  it('hides QuickBooks controls from non-owners', () => {
    expect(getQuickBooksPermissionDisplay(activeAdmin, adminContext)).toBe('hidden');
  });

  it('allows parts manager toggle for active member-role users', () => {
    expect(getPartsManagerPermissionDisplay(activeMember, adminContext)).toBe('toggle');
  });

  it('allows parts consumer toggle for active member-role users', () => {
    expect(getPartsConsumerPermissionDisplay(activeMember, adminContext)).toBe('toggle');
  });

  it('does not allow parts manager toggle for admins', () => {
    expect(getPartsManagerPermissionDisplay(activeAdmin, adminContext)).toBe('not-applicable');
  });

  it('shows mobile permission section for toggles only', () => {
    expect(shouldShowMobilePermissionSection(activeMember, adminContext)).toBe(true);
    expect(shouldShowMobilePermissionSection(activeAdmin, adminContext)).toBe(false);
  });
});
