import { describe, expect, it } from 'vitest';
import { DEV_USERS, USER_GROUPS } from './DevQuickLogin';

describe('DevQuickLogin seed data', () => {
  it('includes the Apex viewer persona in the quick-login dataset', () => {
    expect(DEV_USERS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: 'viewer@apex.test',
          name: 'Vera Viewer',
          role: 'Viewer',
          org: 'Apex Construction',
        }),
      ]),
    );
  });

  it('groups the Apex viewer under the shared Apex quick-login section', () => {
    const apexGroup = USER_GROUPS.find((group) => group.label === 'Apex Construction (Premium)');

    expect(apexGroup?.users.map((user) => user.email)).toContain('viewer@apex.test');
  });
});
