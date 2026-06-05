import { describe, expect, it, vi } from 'vitest';
import type { Notification } from '@/features/work-orders/hooks/useWorkOrderData';
import {
  navigateForNotification,
  notificationHasNavigableAction,
} from '@/utils/notifications/notificationDisplay';

function buildNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    organization_id: 'org-1',
    user_id: 'user-1',
    type: 'member_removed',
    title: 'Removed from organization',
    message: 'You were removed from the organization.',
    data: {},
    read: false,
    is_global: false,
    created_at: '2026-06-05T00:00:00.000Z',
    updated_at: '2026-06-05T00:00:00.000Z',
    ...overrides,
  };
}

describe('notificationDisplay', () => {
  it('treats member_removed notifications as navigable', () => {
    const notification = buildNotification();

    expect(notificationHasNavigableAction(notification)).toBe(true);
  });

  it('navigates member_removed notifications to the dashboard', async () => {
    const notification = buildNotification();
    const navigate = vi.fn();
    const switchOrganization = vi.fn();

    const handled = await navigateForNotification({
      notification,
      organizationId: 'org-1',
      navigate,
      switchOrganization,
    });

    expect(handled).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/dashboard');
    expect(switchOrganization).not.toHaveBeenCalled();
  });
});
