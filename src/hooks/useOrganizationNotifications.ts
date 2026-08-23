import {
  useRealTimeNotifications,
  useNotificationSubscription,
} from '@/hooks/useNotificationSettings';
import type { Notification, NotificationData } from '@/features/work-orders/hooks/useWorkOrderData';

export function toNotificationData(data: unknown): NotificationData {
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    return data as NotificationData;
  }
  return {};
}

export function useOrganizationNotifications(organizationId: string | null | undefined): {
  notifications: Notification[];
  unreadCount: number;
} {
  const orgId = organizationId ?? '';
  const { data: rows = [] } = useRealTimeNotifications(orgId);
  useNotificationSubscription(orgId);

  const notifications: Notification[] = rows.map((row) => ({
    ...row,
    data: toNotificationData(row.data),
  }));

  const unreadCount = organizationId
    ? notifications.filter((notification) => !notification.read).length
    : 0;

  return { notifications, unreadCount };
}
