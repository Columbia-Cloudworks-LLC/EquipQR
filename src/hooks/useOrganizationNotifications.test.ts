import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useRealTimeNotifications,
  useNotificationSubscription,
} from '@/hooks/useNotificationSettings';
import { useOrganizationNotifications } from './useOrganizationNotifications';

vi.mock('@/hooks/useNotificationSettings', () => ({
  useRealTimeNotifications: vi.fn(),
  useNotificationSubscription: vi.fn(),
}));

const notificationRow = {
  id: 'n1',
  organization_id: 'org-1',
  user_id: 'u1',
  type: 'work_order_assigned',
  title: 'Assigned',
  message: 'You were assigned',
  read: false,
  is_global: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('useOrganizationNotifications', () => {
  beforeEach(() => {
    vi.mocked(useNotificationSubscription).mockReturnValue({
      isSubscribed: false,
      userId: null,
    });
  });

  it('normalizes null notification data to an empty object', () => {
    vi.mocked(useRealTimeNotifications).mockReturnValue({
      data: [{ ...notificationRow, data: null }],
    } as never);

    const { result } = renderHook(() => useOrganizationNotifications('org-1'));

    expect(result.current.notifications[0]?.data).toEqual({});
    expect(result.current.unreadCount).toBe(1);
  });

  it('preserves object notification data', () => {
    vi.mocked(useRealTimeNotifications).mockReturnValue({
      data: [{ ...notificationRow, data: { work_order_id: 'wo-1' } }],
    } as never);

    const { result } = renderHook(() => useOrganizationNotifications('org-1'));

    expect(result.current.notifications[0]?.data).toEqual({ work_order_id: 'wo-1' });
  });

  it('returns no unread count when organization is missing', () => {
    vi.mocked(useRealTimeNotifications).mockReturnValue({
      data: [{ ...notificationRow, data: null }],
    } as never);

    const { result } = renderHook(() => useOrganizationNotifications(null));

    expect(result.current.unreadCount).toBe(0);
  });
});
