import { describe, expect, it, vi } from 'vitest';
import type { Notification } from '@/features/work-orders/hooks/useWorkOrderData';
import {
  ORGANIZATION_AUDIT_LOG_PATH,
  ORGANIZATION_MEMBERS_PATH,
  ORGANIZATION_SETTINGS_PATH,
} from '@/features/organization/constants/routes';
import {
  navigateForNotification,
  notificationHasNavigableAction,
  resolveNotificationDestination,
  type NotificationDestination,
  type NotificationDestinationCta,
} from '@/utils/notifications/notificationDestination';

function buildNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    organization_id: 'org-1',
    user_id: 'user-1',
    type: 'general',
    title: 'Notification',
    message: 'Message',
    data: {},
    read: false,
    is_global: false,
    created_at: '2026-06-05T00:00:00.000Z',
    updated_at: '2026-06-05T00:00:00.000Z',
    ...overrides,
  };
}

const view = (detail: string) => ({ compact: 'View →', detail });
const respond = (detail: string) => ({ compact: 'Respond →', detail });

const navigable = (
  path: string,
  switchToOrganizationId: string | null,
  cta: NotificationDestinationCta,
): NotificationDestination => ({
  navigable: true,
  path,
  switchToOrganizationId,
  cta,
});

describe('resolveNotificationDestination', () => {
  it.each([
    {
      name: 'ownership_transfer_request responds on organization settings and switches via data.organization_id',
      notification: {
        type: 'ownership_transfer_request',
        data: { organization_id: 'org-2', workspace_org_id: 'ws-ignored' },
      },
      expected: navigable(
        ORGANIZATION_SETTINGS_PATH,
        'org-2',
        respond('Click to respond to transfer request'),
      ),
    },
    {
      name: 'ownership_transfer_accepted views settings and falls back to data.workspace_org_id',
      notification: {
        type: 'ownership_transfer_accepted',
        data: { workspace_org_id: 'ws-1' },
      },
      expected: navigable(
        ORGANIZATION_SETTINGS_PATH,
        'ws-1',
        view('Click to view organization settings'),
      ),
    },
    {
      name: 'ownership_transfer_accepted prefers data.new_org_id when the departing owner was removed',
      notification: {
        type: 'ownership_transfer_accepted',
        data: {
          organization_id: 'org-2',
          workspace_org_id: 'ws-ignored',
          new_org_id: 'org-personal',
        },
      },
      expected: navigable(
        ORGANIZATION_SETTINGS_PATH,
        'org-personal',
        view('Click to view organization settings'),
      ),
    },
    {
      name: 'workspace_merge_request responds on organization settings',
      notification: {
        type: 'workspace_merge_request',
        data: { organization_id: 'org-2' },
      },
      expected: navigable(
        ORGANIZATION_SETTINGS_PATH,
        'org-2',
        respond('Click to respond to merge request'),
      ),
    },
    {
      name: 'workspace_merge_accepted views organization settings',
      notification: {
        type: 'workspace_merge_accepted',
        data: { workspace_org_id: 'ws-2' },
      },
      expected: navigable(
        ORGANIZATION_SETTINGS_PATH,
        'ws-2',
        view('Click to view organization settings'),
      ),
    },
    {
      name: 'workspace_migration opens dashboard and switches via data.workspace_org_id',
      notification: {
        type: 'workspace_migration',
        data: { workspace_org_id: 'ws-3', organization_id: 'org-ignored' },
      },
      expected: navigable('/dashboard', 'ws-3', view('Click to open workspace')),
    },
    {
      name: 'export_ready opens reports with no org switch',
      notification: { type: 'export_ready', data: { export_log_id: 'exp-1' } },
      expected: navigable('/dashboard/reports', null, view('Click to view reports')),
    },
    {
      name: 'audit_export opens the audit log and switches when data org is present',
      notification: {
        type: 'audit_export',
        data: { organization_id: 'org-2' },
      },
      expected: navigable(
        ORGANIZATION_AUDIT_LOG_PATH,
        'org-2',
        view('Click to view audit log'),
      ),
    },
    {
      name: 'audit_export stays on the current org when data has no org id',
      notification: { type: 'audit_export', data: { exported_count: 3 } },
      expected: navigable(
        ORGANIZATION_AUDIT_LOG_PATH,
        null,
        view('Click to view audit log'),
      ),
    },
    {
      name: 'team_member_added opens the team and switches when data org is present',
      notification: {
        type: 'team_member_added',
        data: { team_id: 'team-9', organization_id: 'org-2' },
      },
      expected: navigable('/dashboard/teams/team-9', 'org-2', view('Click to view team')),
    },
    {
      name: 'team_member_role_changed opens the team without a switch when data has no org id',
      notification: {
        type: 'team_member_role_changed',
        data: { team_id: 'team-4' },
      },
      expected: navigable('/dashboard/teams/team-4', null, view('Click to view team')),
    },
    {
      name: 'member_added opens members and switches when data org is present',
      notification: {
        type: 'member_added',
        data: { organization_id: 'org-2' },
      },
      expected: navigable(ORGANIZATION_MEMBERS_PATH, 'org-2', view('Click to view members')),
    },
    {
      name: 'member_role_changed opens members without a switch when data has no org id',
      notification: { type: 'member_role_changed', data: {} },
      expected: navigable(ORGANIZATION_MEMBERS_PATH, null, view('Click to view members')),
    },
    {
      name: 'member_removed opens the dashboard with no org switch',
      notification: { type: 'member_removed', data: { organization_id: 'org-2' } },
      expected: navigable('/dashboard', null, view('Click to go to dashboard')),
    },
    {
      name: 'work_order payload opens the work order after type-specific rules',
      notification: {
        type: 'work_order_assigned',
        data: { work_order_id: 'wo-88' },
      },
      expected: navigable(
        '/dashboard/work-orders/wo-88',
        null,
        view('Click to view work order'),
      ),
    },
    {
      name: 'general is not navigable',
      notification: { type: 'general', data: {} },
      expected: { navigable: false },
    },
  ] satisfies Array<{
    name: string;
    notification: Pick<Notification, 'type' | 'data'>;
    expected: NotificationDestination;
  }>)('$name', ({ notification, expected }) => {
    expect(resolveNotificationDestination(buildNotification(notification))).toEqual(expected);
  });

  it('is not navigable when team_member_added is missing team_id', () => {
    const dest = resolveNotificationDestination(
      buildNotification({ type: 'team_member_added', data: { organization_id: 'org-2' } }),
    );

    expect(dest, 'missing team_id must fail closed').toEqual({ navigable: false });
  });

  it('is not navigable when a work_order type has no work_order_id', () => {
    const dest = resolveNotificationDestination(
      buildNotification({ type: 'work_order', data: {} }),
    );

    expect(dest, 'work_order without work_order_id has no destination').toEqual({
      navigable: false,
    });
  });

  it('is not navigable when workspace_migration is missing workspace_org_id', () => {
    const dest = resolveNotificationDestination(
      buildNotification({
        type: 'workspace_migration',
        data: { organization_id: 'org-2' },
      }),
    );

    expect(dest, 'workspace_migration requires data.workspace_org_id').toEqual({
      navigable: false,
    });
  });

  it('does not use notification.organization_id for org switch', () => {
    const dest = resolveNotificationDestination(
      buildNotification({
        type: 'member_added',
        organization_id: 'row-org',
        data: {},
      }),
    );

    expect(dest.navigable && dest.switchToOrganizationId, 'row organization_id is not a switch source').toBe(
      null,
    );
  });
});

describe('notificationHasNavigableAction', () => {
  it('mirrors resolve().navigable', () => {
    expect(
      notificationHasNavigableAction(buildNotification({ type: 'member_removed' })),
    ).toBe(true);
    expect(
      notificationHasNavigableAction(buildNotification({ type: 'general' })),
    ).toBe(false);
  });
});

describe('navigateForNotification', () => {
  it('navigates member_removed to the dashboard without switching orgs', async () => {
    const navigate = vi.fn();
    const switchOrganization = vi.fn();

    const handled = await navigateForNotification({
      notification: buildNotification({ type: 'member_removed' }),
      organizationId: 'org-1',
      navigate,
      switchOrganization,
    });

    expect(handled, 'member_removed is handled').toBe(true);
    expect(navigate).toHaveBeenCalledWith('/dashboard');
    expect(switchOrganization).not.toHaveBeenCalled();
  });

  it('returns false and does not navigate when a required org switch reports failure', async () => {
    const navigate = vi.fn();
    const switchOrganization = vi.fn().mockResolvedValue(false);

    const handled = await navigateForNotification({
      notification: buildNotification({
        type: 'member_added',
        data: { organization_id: 'org-2' },
      }),
      organizationId: 'org-1',
      navigate,
      switchOrganization,
    });

    expect(handled, 'failed switch must abort navigation').toBe(false);
    expect(switchOrganization).toHaveBeenCalledWith('org-2');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('returns false when the destination is not navigable', async () => {
    const navigate = vi.fn();
    const switchOrganization = vi.fn();

    const handled = await navigateForNotification({
      notification: buildNotification({ type: 'general' }),
      organizationId: 'org-1',
      navigate,
      switchOrganization,
    });

    expect(handled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(switchOrganization).not.toHaveBeenCalled();
  });

  it('skips switchOrganization when already on the target org', async () => {
    const navigate = vi.fn();
    const switchOrganization = vi.fn();

    const handled = await navigateForNotification({
      notification: buildNotification({
        type: 'member_added',
        data: { organization_id: 'org-1' },
      }),
      organizationId: 'org-1',
      navigate,
      switchOrganization,
    });

    expect(handled).toBe(true);
    expect(switchOrganization).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(ORGANIZATION_MEMBERS_PATH);
  });
});
