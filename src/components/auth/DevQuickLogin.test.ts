import { describe, expect, it } from 'vitest';
import {
  DEV_USERS,
  PREVIEW_QA_USERS,
  USER_GROUPS,
  getQuickLoginUserGroups,
} from './DevQuickLogin';

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

  it('keeps the full local-dev persona list when DEV is the reason quick login is enabled', () => {
    const localDevGroups = getQuickLoginUserGroups({
      isDev: true,
      isPreviewQuickLoginEnabled: false,
    });

    const localDevEmails = localDevGroups.flatMap((group) => group.users.map((user) => user.email));

    expect(localDevEmails).toContain('admin@apex.test');
    expect(localDevEmails).toContain('multi@equipqr.test');
    expect(localDevEmails).toContain('owner@valley.test');
  });

  it('limits preview quick login to the signed QA personas and never exposes a Member row', () => {
    const previewGroups = getQuickLoginUserGroups({
      isDev: false,
      isPreviewQuickLoginEnabled: true,
    });

    const previewUsers = previewGroups.flatMap((group) => group.users);
    const previewEmails = previewUsers.map((user) => user.email);
    const previewRoles = previewUsers.map((user) => user.role);
    const previewGroupLabels = previewGroups.map((group) => group.label);

    expect(previewGroupLabels).toEqual([
      'Apex Construction (Premium)',
      'Metro Equipment (Premium)',
    ]);
    expect(previewEmails).toEqual([
      'owner@apex.test',
      'tech@apex.test',
      'viewer@apex.test',
      'owner@metro.test',
    ]);
    expect(previewRoles).toEqual(['Owner', 'Technician', 'Viewer', 'Owner']);
    expect(previewEmails).not.toContain('admin@apex.test');
    expect(previewEmails).not.toContain('multi@equipqr.test');
    expect(previewEmails).not.toContain('owner@valley.test');
    expect(previewEmails).not.toContain('owner@industrial.test');
    expect(previewEmails).not.toContain('owner@freshstart.test');
    expect(previewEmails).not.toContain('e2e.invitee.pending@apex.test');
    expect(previewEmails).not.toContain('tech@metro.test');
    expect(previewRoles).not.toContain('Member');
    expect(PREVIEW_QA_USERS).toEqual(previewUsers);
  });
});
