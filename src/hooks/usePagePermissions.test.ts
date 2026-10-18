import { describe, expect, it } from 'vitest';
import type { SessionOrganization } from '@/contexts/SessionContext';
import { usePagePermissions } from './usePagePermissions';

function makeOrg(overrides: Partial<SessionOrganization> = {}): SessionOrganization {
  return {
    id: 'org-1',
    name: 'Test Yard',
    plan: 'free',
    memberCount: 2,
    maxMembers: 5,
    features: [],
    scanLocationCollectionEnabled: false,
    userRole: 'admin',
    userStatus: 'active',
    ...overrides,
  };
}

describe('usePagePermissions', () => {
  it('returns false when organization is null', () => {
    expect(usePagePermissions(null)).toEqual({ canInviteMembers: false });
  });

  it('allows permanent owners and admins to invite members', () => {
    expect(usePagePermissions(makeOrg({ userRole: 'owner' }))).toEqual({
      canInviteMembers: true,
    });
    expect(usePagePermissions(makeOrg({ userRole: 'admin' }))).toEqual({
      canInviteMembers: true,
    });
  });

  it('denies ordinary members from inviting members', () => {
    expect(usePagePermissions(makeOrg({ userRole: 'member' }))).toEqual({
      canInviteMembers: false,
    });
  });

  it('denies EquipQR Support sessions from inviting members even when role is admin', () => {
    expect(
      usePagePermissions(makeOrg({ userRole: 'admin', isSupportAccess: true })),
    ).toEqual({
      canInviteMembers: false,
    });
  });
});
