import React, { useState } from 'react';
import { Bell, Check, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/utils/logger';
import { 
  useRealTimeNotifications, 
  useNotificationSubscription,
  useMarkAllNotificationsAsRead
} from '@/hooks/useNotificationSettings';
import { useMarkNotificationAsRead, type Notification } from '@/features/work-orders/hooks/useWorkOrderData';
import { useOrganization } from '@/contexts/OrganizationContext';

interface NotificationBellProps {
  organizationId: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ organizationId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { switchOrganization } = useOrganization();
  
  // Set up real-time notifications
  const { data: notifications = [] } = useRealTimeNotifications(organizationId);
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  
  // Set up real-time subscription
  useNotificationSubscription(organizationId);

  const unreadCount = notifications.filter(n => !n.read).length;
  const recentNotifications = notifications.slice(0, 5);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      try {
        await markAsReadMutation.mutateAsync(notification.id);
      } catch (error) {
        logger.error('Error marking notification as read', error);
      }
    }

    setIsOpen(false);

    // Handle ownership transfer and workspace merge notifications - switch to the target org and navigate
    if (notification.type === 'ownership_transfer_request' || notification.type === 'workspace_merge_request') {
      const targetOrgId = notification.data?.organization_id || notification.data?.workspace_org_id;
      if (targetOrgId && targetOrgId !== organizationId) {
        // Switch to the organization first, then navigate to settings
        await switchOrganization(targetOrgId);
      }
      navigate('/dashboard/organization');
      return;
    }

    if (notification.type === 'ownership_transfer_accepted' || 
        notification.type === 'ownership_transfer_rejected' ||
        notification.type === 'ownership_transfer_cancelled' ||
        notification.type === 'workspace_merge_accepted' ||
        notification.type === 'workspace_merge_rejected' ||
        notification.type === 'member_added' ||
        notification.type === 'member_role_changed' ||
        notification.type === 'team_member_added' ||
        notification.type === 'team_member_role_changed' ||
        notification.type === 'audit_export') {
      // These are informational - navigate to organization page
      const targetOrgId = notification.data?.organization_id || notification.data?.workspace_org_id;
      if (targetOrgId && targetOrgId !== organizationId) {
        await switchOrganization(targetOrgId);
      }
      navigate('/dashboard/organization');
      return;
    }

    // Navigate to work order if available
    if (notification.data?.work_order_id) {
      navigate(`/dashboard/work-orders/${notification.data.work_order_id}`);
      return;
    }
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
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'work_order_submitted':
        return '📝';
      case 'work_order_accepted':
        return '✅';
      case 'work_order_assigned':
        return '👤';
      case 'work_order_in_progress':
        return '⚡';
      case 'work_order_on_hold':
        return '⏸️';
      case 'work_order_completed':
        return '🎉';
      case 'work_order_cancelled':
        return '❌';
      // Ownership transfer notifications
      case 'ownership_transfer_request':
        return '🔄';
      case 'ownership_transfer_accepted':
        return '👑';
      case 'ownership_transfer_rejected':
        return '🚫';
      case 'ownership_transfer_cancelled':
        return '↩️';
      case 'workspace_merge_request':
        return '🧩';
      case 'workspace_merge_accepted':
        return '✅';
      case 'workspace_merge_rejected':
        return '🚫';
      case 'member_removed':
        return '👋';
      case 'member_added':
        return '➕';
      case 'member_role_changed':
        return '🛡️';
      case 'team_member_added':
        return '👥';
      case 'team_member_role_changed':
        return '🔐';
      case 'audit_export':
        return '📤';
      default:
        return '📢';
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}>
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-3.5 min-w-3.5 flex items-center justify-center p-0 text-[9px] font-medium border border-background"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
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
        
        <DropdownMenuSeparator />
        
        {recentNotifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-1">
              {recentNotifications.map((notification) => {
                const hasAction = notification.data?.work_order_id || 
                  notification.type.startsWith('ownership_transfer') ||
                  notification.type.startsWith('workspace_merge') ||
                  notification.type === 'member_added' ||
                  notification.type === 'member_role_changed' ||
                  notification.type === 'team_member_added' ||
                  notification.type === 'team_member_role_changed' ||
                  notification.type === 'audit_export';
                const isTransferRequest = notification.type === 'ownership_transfer_request' || notification.type === 'workspace_merge_request';
                
                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`p-3 cursor-pointer ${
                      notification.read ? 'opacity-60' : ''
                    } ${isTransferRequest && !notification.read ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3 w-full">
                      <div className="text-lg flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium truncate">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(notification.created_at), 'MMM d, h:mm a')}
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
