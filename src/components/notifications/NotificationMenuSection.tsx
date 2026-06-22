import React from 'react';
import { Bell, Check, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { useNotificationMarkReadOnClick } from '@/hooks/useNotificationMarkReadOnClick';
import { logger } from '@/utils/logger';
import { useMarkAllNotificationsAsRead } from '@/hooks/useNotificationSettings';
import { useMarkNotificationAsRead, type Notification } from '@/features/work-orders/hooks/useWorkOrderData';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  getNotificationEmoji,
  navigateForNotification,
  notificationHasNavigableAction,
} from '@/utils/notifications/notificationDisplay';

interface NotificationMenuSectionProps {
  organizationId: string;
  notifications: Notification[];
  onClose: () => void;
}

const NotificationMenuSection: React.FC<NotificationMenuSectionProps> = ({
  organizationId,
  notifications,
  onClose,
}) => {
  const navigate = useNavigate();
  const { formatRelative } = useFormatTimestamp();
  const { switchOrganization } = useOrganization();

  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  const unreadCount = notifications.filter((n) => !n.read).length;
  const recentNotifications = notifications.slice(0, 5);

  const markReadIfNeeded = useNotificationMarkReadOnClick(markAsReadMutation);

  const handleNotificationClick = async (notification: Notification) => {
    await markReadIfNeeded(notification);
    onClose();
    await navigateForNotification({
      notification,
      organizationId,
      navigate,
      switchOrganization,
    });
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync(organizationId);
    } catch (error) {
      logger.error('Error marking all notifications as read', error);
    }
  };

  const handleViewAllNotifications = () => {
    navigate('/dashboard/notifications');
    onClose();
  };

  return (
    <>
      <DropdownMenuLabel className="flex items-center justify-between px-2 py-1.5">
        <span className="text-sm font-medium">Notifications</span>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="h-6 text-xs"
          >
            <Check className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </DropdownMenuLabel>

      {recentNotifications.length === 0 ? (
        <div className="px-4 py-3 text-center text-muted-foreground">
          <Bell className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
          <p className="text-sm">No notifications yet</p>
        </div>
      ) : (
        <ScrollArea className="max-h-64">
          <div className="space-y-0.5 px-1">
            {recentNotifications.map((notification) => {
              const hasAction = notificationHasNavigableAction(notification);
              const isTransferRequest =
                notification.type === 'ownership_transfer_request' ||
                notification.type === 'workspace_merge_request';

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={`p-2.5 cursor-pointer ${
                    notification.read ? 'opacity-60' : ''
                  } ${isTransferRequest && !notification.read ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-2.5 w-full">
                    <div className="text-base flex-shrink-0">
                      {getNotificationEmoji(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium truncate">{notification.title}</p>
                        {!notification.read && (
                          <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground">
                          {formatRelative(notification.created_at)}
                        </p>
                        {hasAction && (
                          <span className="text-xs text-primary font-medium">
                            {isTransferRequest ? 'Respond →' : 'View →'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {notifications.length > 5 && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleViewAllNotifications} className="justify-center">
            <Eye className="h-4 w-4 mr-2" />
            View All Notifications
          </DropdownMenuItem>
        </>
      )}

      <DropdownMenuSeparator />
    </>
  );
};

export default NotificationMenuSection;
