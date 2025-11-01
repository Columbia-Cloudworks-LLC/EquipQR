
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, AlertCircle, CheckCircle, Settings, Users } from 'lucide-react';
import { useNotifications, useMarkNotificationAsRead, type Notification } from '@/hooks/useWorkOrderData';
import { useWorkOrderPermissionLevels } from '@/hooks/useWorkOrderPermissionLevels';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface NotificationCenterProps {
  organizationId: string;
  maxHeight?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  organizationId,
  maxHeight = '400px'
}) => {
  const { data: notifications = [], isLoading } = useNotifications(organizationId);
  const markAsReadMutation = useMarkNotificationAsRead();
  const permissionLevels = useWorkOrderPermissionLevels();

  const unreadCount = notifications.filter(n => !n.read).length;

  // Filter notifications based on user role
  const filteredNotifications = notifications.filter(notification => {
    if (permissionLevels.isManager) {
      // Managers see all notifications
      return true;
    }
    
    if (permissionLevels.isRequestor) {
      // Requestors only see notifications about their own work orders or general updates
      return notification.type === 'work_order_accepted' || 
             notification.type === 'work_order_assigned' ||
             notification.type === 'work_order_completed' ||
             notification.data?.created_by === 'current-user-id'; // Would be actual user ID
    }
    
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'work_order_request':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'work_order_accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'work_order_assigned':
        return <Settings className="h-4 w-4 text-orange-500" />;
      case 'work_order_completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'team_assignment':
        return <Users className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationMessage = (notification: Notification) => {
    if (permissionLevels.isRequestor && notification.type === 'work_order_request') {
      return 'Your work order request has been submitted for review';
    }
    return notification.message;
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsReadMutation.mutateAsync(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-32 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          className="space-y-2 overflow-y-auto pr-2"
          style={{ maxHeight }}
        >
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications yet</p>
              {permissionLevels.isRequestor && (
                <p className="text-sm mt-2">
                  You'll receive updates about your work order requests here
                </p>
              )}
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border transition-colors ${
                  notification.read 
                    ? 'bg-background' 
                    : 'bg-muted/50 border-primary/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm">
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1">
                      {getNotificationMessage(notification)}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                      </span>
                      
                      {notification.data?.work_order_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-6 text-xs"
                        >
                          <Link to={`/dashboard/work-orders/${notification.data.work_order_id}`}>
                            View
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationCenter;
