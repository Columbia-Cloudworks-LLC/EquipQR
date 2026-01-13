import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Check, Search, Filter, Calendar, Eye, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { 
  useRealTimeNotifications, 
  useNotificationSubscription,
  useMarkAllNotificationsAsRead
} from '@/hooks/useNotificationSettings';
import { useMarkNotificationAsRead, type Notification } from '@/features/work-orders/hooks/useWorkOrderData';
import { logger } from '@/utils/logger';

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

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      try {
        await markAsReadMutation.mutateAsync(notification.id);
      } catch (error) {
        logger.error('Error marking notification as read', error);
      }
    }

    // Handle ownership transfer notifications - switch to target org and navigate
    if (notification.type.startsWith('ownership_transfer')) {
      const targetOrgId = notification.data?.organization_id;
      if (targetOrgId && targetOrgId !== organizationId) {
        // Switch to the organization first, then navigate to settings
        await switchOrganization(targetOrgId);
      }
      navigate('/dashboard/organization');
      return;
    }

    // Navigate based on notification type
    if (notification.data?.work_order_id) {
      navigate(`/dashboard/work-orders/${notification.data.work_order_id}`);
    } else if (notification.type === 'member_removed') {
      // Navigate to dashboard if removed from org
      navigate('/dashboard');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!organizationId) return;
    
    try {
      await markAllAsReadMutation.mutateAsync(organizationId);
    } catch (error) {
      logger.error('Error marking all notifications as read', error);
    }
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
      case 'member_removed':
        return '👋';
      default:
        return '📢';
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'work_order_submitted':
        return 'Submitted';
      case 'work_order_accepted':
        return 'Accepted';
      case 'work_order_assigned':
        return 'Assigned';
      case 'work_order_in_progress':
        return 'In Progress';
      case 'work_order_on_hold':
        return 'On Hold';
      case 'work_order_completed':
        return 'Completed';
      case 'work_order_cancelled':
        return 'Cancelled';
      // Ownership transfer notifications
      case 'ownership_transfer_request':
        return 'Transfer Request';
      case 'ownership_transfer_accepted':
        return 'Transfer Accepted';
      case 'ownership_transfer_rejected':
        return 'Transfer Declined';
      case 'ownership_transfer_cancelled':
        return 'Transfer Cancelled';
      case 'member_removed':
        return 'Member Removed';
      default:
        return 'General';
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
            Your notification history • Notifications are kept for 7 days
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="work_order_submitted">Submitted</SelectItem>
                <SelectItem value="work_order_accepted">Accepted</SelectItem>
                <SelectItem value="work_order_assigned">Assigned</SelectItem>
                <SelectItem value="work_order_in_progress">In Progress</SelectItem>
                <SelectItem value="work_order_on_hold">On Hold</SelectItem>
                <SelectItem value="work_order_completed">Completed</SelectItem>
                <SelectItem value="work_order_cancelled">Cancelled</SelectItem>
                <SelectItem value="ownership_transfer_request">Transfer Request</SelectItem>
                <SelectItem value="ownership_transfer_accepted">Transfer Accepted</SelectItem>
                <SelectItem value="ownership_transfer_rejected">Transfer Declined</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRead} onValueChange={setFilterRead}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
                const isTransferRequest = notification.type === 'ownership_transfer_request';
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
                      {getNotificationIcon(notification.type)}
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
                      
                      {(notification.data?.work_order_id || notification.type.startsWith('ownership_transfer')) && (
                        <div className="flex items-center gap-2 mt-3">
                          <ArrowRight className="h-3 w-3 text-primary" />
                          <span className="text-xs text-primary font-medium">
                            {notification.type === 'ownership_transfer_request'
                              ? 'Click to respond to transfer request'
                              : notification.data?.work_order_id 
                                ? 'Click to view work order'
                                : 'Click to view organization'
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
