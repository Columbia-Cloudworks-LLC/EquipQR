import { describe, expect, it } from 'vitest';
import {
  getPrioritizedOrganizationId,
  withPersonalOrgFlag,
} from '@/utils/prioritizeOrganizations';

describe('getPrioritizedOrganizationId', () => {
  it('prefers non-personal orgs over the personal owner org', () => {
    const orgId = getPrioritizedOrganizationId([
      { id: 'personal-org', userRole: 'owner', isPersonal: true },
      { id: 'invited-org', userRole: 'member', isPersonal: false },
    ]);

    expect(orgId).toBe('invited-org');
  });

  it('falls back to highest role when org types match', () => {
    const orgId = getPrioritizedOrganizationId([
      { id: 'member-org', userRole: 'member' },
      { id: 'admin-org', userRole: 'admin' },
    ]);

    expect(orgId).toBe('admin-org');
  });
});

describe('withPersonalOrgFlag', () => {
  it('marks only the personal organization id', () => {
    const orgs = withPersonalOrgFlag(
      [
        { id: 'personal-org', name: 'Mine' },
        { id: 'workspace-org', name: 'Team' },
      ],
      'personal-org',
    );

    expect(orgs).toEqual([
      { id: 'personal-org', name: 'Mine', isPersonal: true },
      { id: 'workspace-org', name: 'Team', isPersonal: false },
    ]);
  });
});
