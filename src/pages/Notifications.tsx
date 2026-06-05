// fallow-ignore-file code-duplication
// Duplication rationale: Notifications page reuses display formatting helpers
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, Calendar, ArrowRight } from 'lucide-react';
import NotificationsToolbar from './notifications/NotificationsToolbar';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { 
  useRealTimeNotifications, 
  useNotificationSubscription,
  useMarkAllNotificationsAsRead
} from '@/hooks/useNotificationSettings';
import { useMarkNotificationAsRead, type Notification } from '@/features/work-orders/hooks/useWorkOrderData';
import { useNotificationMarkReadOnClick } from '@/hooks/useNotificationMarkReadOnClick';
import { logger } from '@/utils/logger';
import {
  getNotificationEmoji,
  getNotificationTypeLabel,
  navigateForNotification,
} from '@/utils/notifications/notificationDisplay';

const Notifications: React.FC = () => {
  const { organizationId, switchOrganization } = useOrganization();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');

  // Set up real-time notifications
  const { data: notifications = [], isLoading } = useRealTimeNotifications(organizationId || '');
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  
  // Set up real-time subscription
  useNotificationSubscription(organizationId || '');

  // Filter notifications based on search and filters
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || notification.type === filterType;
    
    const matchesRead = filterRead === 'all' || 
                       (filterRead === 'read' && notification.read) ||
                       (filterRead === 'unread' && !notification.read);
    
    return matchesSearch && matchesType && matchesRead;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markReadIfNeeded = useNotificationMarkReadOnClick(markAsReadMutation);

  const handleNotificationClick = async (notification: Notification) => {
    await markReadIfNeeded(notification);

    await navigateForNotification({
      notification,
      organizationId,
      navigate,
      switchOrganization,
    });
  };

  const handleMarkAllAsRead = async () => {
    if (!organizationId) return;
    
    try {
      await markAllAsReadMutation.mutateAsync(organizationId);
    } catch (error) {
      logger.error('Error marking all notifications as read', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-2">
            Your notification history
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-64 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount} unread</Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-2">
            Your notification history • Notifications are kept for 30 days
          </p>
        </div>
        
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead} variant="outline">
            <Check className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Filters */}
      <NotificationsToolbar
        searchTerm={searchTerm}
        filterType={filterType}
        filterRead={filterRead}
        resultCount={filteredNotifications.length}
        onSearchChange={setSearchTerm}
        onFilterTypeChange={setFilterType}
        onFilterReadChange={setFilterRead}
        onClearFilters={() => {
          setSearchTerm('');
          setFilterType('all');
          setFilterRead('all');
        }}
      />

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Notification History
            <Badge variant="secondary">{filteredNotifications.length} notifications</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">No notifications found</p>
              <p className="text-sm">
                {searchTerm || filterType !== 'all' || filterRead !== 'all'
                  ? 'Try adjusting your filters'
                  : 'You\'ll see work order notifications here'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => {
                const isTransferRequest = notification.type === 'ownership_transfer_request' || notification.type === 'workspace_merge_request';
                const isOwnershipTransferRequest = notification.type === 'ownership_transfer_request';
                const isWorkspaceMergeRequest = notification.type === 'workspace_merge_request';
                const isActionRequired = isTransferRequest && !notification.read;
                
                return (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                    isActionRequired
                      ? 'bg-primary/5 border-primary/40 border-l-4'
                      : notification.read 
                        ? 'bg-background opacity-75' 
                        : 'bg-muted/30 border-primary/20'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-4">
                    <div className="text-2xl flex-shrink-0 mt-1">
                      {getNotificationEmoji(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm sm:text-base flex items-center gap-2">
                            {notification.title}
                            {!notification.read && (
                              <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0" />
                            )}
                          </h3>
                          <Badge variant="outline" className="text-xs mt-1">
                            {getNotificationTypeLabel(notification.type)}
                          </Badge>
                        </div>
                        
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(notification.created_at), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(notification.created_at), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      
                      {(notification.data?.work_order_id ||
                        notification.type.startsWith('ownership_transfer') ||
                        notification.type.startsWith('workspace_merge') ||
                        notification.type === 'member_added' ||
                        notification.type === 'member_role_changed' ||
                        notification.type === 'team_member_added' ||
                        notification.type === 'team_member_role_changed' ||
                        notification.type === 'audit_export') && (
                        <div className="flex items-center gap-2 mt-3">
                          <ArrowRight className="h-3 w-3 text-primary" />
                          <span className="text-xs text-primary font-medium">
                            {isOwnershipTransferRequest
                              ? 'Click to respond to transfer request'
                              : isWorkspaceMergeRequest
                                ? 'Click to respond to merge request'
                              : notification.data?.work_order_id 
                                ? 'Click to view work order'
                                : 'Click to view organization settings'
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;
