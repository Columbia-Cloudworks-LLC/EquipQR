import {
  useRealTimeNotifications,
  useNotificationSubscription,
} from '@/hooks/useNotificationSettings';
import type { Notification } from '@/features/work-orders/hooks/useWorkOrderData';

export function useOrganizationNotifications(organizationId: string | null | undefined): {
  notifications: Notification[];
  unreadCount: number;
} {
  const orgId = organizationId ?? '';
  const { data: notifications = [] } = useRealTimeNotifications(orgId);
  useNotificationSubscription(orgId);

  const unreadCount = organizationId
    ? notifications.filter((notification) => !notification.read).length
    : 0;

  return { notifications, unreadCount };
}
