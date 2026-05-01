
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, Play, Pause, XCircle, FileText, User } from 'lucide-react';
import type { WorkOrder as EnhancedWorkOrder } from '@/features/work-orders/types/workOrder';
import { workOrderRevertService } from '@/features/work-orders/services/workOrderRevertService';

interface WorkOrderTimelineProps {
  workOrder: EnhancedWorkOrder;
  showDetailedHistory?: boolean;
}

interface TimelineEvent {
  id: string | number;
  title: string;
  description: string;
  timestamp: string;
  type: string;
  icon: React.ElementType;
  user: string;
  isPublic: boolean;
}

// ─── Pure helpers (no component state) ───────────────────────────────────────

const formatStatusLabel = (status: string) =>
  status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

const getStatusChangeTitle = (oldStatus: string | null, newStatus: string) => {
  if (!oldStatus) return 'Work Order Created';
  if (oldStatus === 'completed' && newStatus === 'accepted') return 'Work Order Reverted';
  if (oldStatus === 'cancelled' && newStatus === 'accepted') return 'Work Order Reverted';

  switch (newStatus) {
    case 'accepted': return 'Work Order Accepted';
    case 'assigned': return 'Work Assigned';
    case 'in_progress': return 'Work Started';
    case 'completed': return 'Work Completed';
    case 'on_hold': return 'Work On Hold';
    case 'cancelled': return 'Work Order Cancelled';
    default: return 'Status Updated';
  }
};

const getStatusChangeDescription = (oldStatus: string | null, newStatus: string, reason?: string) => {
  if (!oldStatus) return 'Work order was submitted';

  let baseDescription = `Status changed from ${formatStatusLabel(oldStatus)} to ${formatStatusLabel(newStatus)}`;
  if (reason && reason !== 'Status updated') {
    baseDescription += ` — ${reason}`;
  }
  return baseDescription;
};

// ─── Component ────────────────────────────────────────────────────────────────

const WorkOrderTimeline: React.FC<WorkOrderTimelineProps> = ({ 
  workOrder, 
  showDetailedHistory = true 
}) => {
  const [historyEvents, setHistoryEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const { data } = await workOrderRevertService.getWorkOrderHistory(workOrder.id);
        
        if (data) {
          const events: TimelineEvent[] = data.map((history: {
            id: string | number;
            old_status: string | null;
            new_status: string;
            changed_at: string;
            reason?: string;
            profiles?: { name?: string };
          }) => ({
            id: history.id,
            title: getStatusChangeTitle(history.old_status, history.new_status),
            description: getStatusChangeDescription(history.old_status, history.new_status, history.reason),
            timestamp: history.changed_at,
            type: history.new_status,
            icon: getStatusIcon(history.new_status),
            user: history.profiles?.name || 'System',
            isPublic: true
          }));
          
          setHistoryEvents(events);
        }
      } catch (error) {
        console.error('Error fetching work order history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [workOrder.id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return FileText;
      case 'accepted': return CheckCircle;
      case 'assigned': return User;
      case 'in_progress': return Play;
      case 'completed': return CheckCircle;
      case 'on_hold': return Pause;
      case 'cancelled': return XCircle;
      default: return Clock;
    }
  };

  const getTimelineEvents = () => {
    const events: TimelineEvent[] = [];

    // Only add the hardcoded creation event if history doesn't already include one
    const historyHasCreation = historyEvents.some(e => e.title === 'Work Order Created');
    if (!historyHasCreation) {
      events.push({
        id: 'created',
        title: 'Work Order Created',
        description: `Work order was submitted${workOrder.assigneeName ? ` and assigned to ${workOrder.assigneeName}` : ''}`,
        timestamp: workOrder.created_date,
        type: 'created',
        icon: FileText,
        user: 'System',
        isPublic: true
      });
    }

    events.push(...historyEvents);

    // Add the current status if different from last history event
    const lastHistoryEvent = historyEvents[0]; // Most recent first
    if (!lastHistoryEvent || lastHistoryEvent.type !== workOrder.status) {
      const currentEvent: TimelineEvent = {
        id: 'current',
        title: getStatusChangeTitle(lastHistoryEvent?.type || null, workOrder.status),
        description: getStatusChangeDescription(lastHistoryEvent?.type || null, workOrder.status),
        timestamp: workOrder.updated_at || workOrder.created_date,
        type: workOrder.status,
        icon: getStatusIcon(workOrder.status),
        user: workOrder.assigneeName || 'System',
        isPublic: true
      };
      events.push(currentEvent);
    }

    // Filter events based on permission level
    const filteredEvents = showDetailedHistory 
      ? events 
      : events.filter(event => event.isPublic);

    // Sort by timestamp descending (most recent first)
    return filteredEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'created':
      case 'submitted':
        return 'bg-info/20 text-info border-info/30';
      case 'accepted':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'assigned':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'in_progress':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'completed':
        return 'bg-success/20 text-success border-success/30';
      case 'on_hold':
        return 'bg-muted text-foreground border-border';
      case 'cancelled':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-muted text-foreground border-border';
    }
  };

  const formatEventTimestamp = (timestamp: string) =>
    new Date(timestamp).toLocaleString([], {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const timelineEvents = getTimelineEvents();

  return (
    <Card className="shadow-elevation-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Timeline (Status Events)
          {!showDetailedHistory && (
            <Badge variant="outline" className="text-xs">
              Limited View
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="w-8 h-8 bg-muted animate-pulse rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
                  <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {timelineEvents.map((event, index) => {
              const Icon = event.icon;
              const isLast = index === timelineEvents.length - 1;
            
              return (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`p-2 rounded-full ${getEventColor(event.type)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {!isLast && <div className="w-px h-8 bg-border mt-2" />}
                  </div>
                  
                  <div className="flex-1 space-y-1 pb-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{event.title}</h4>
                      <time className="text-sm text-muted-foreground">
                        {formatEventTimestamp(event.timestamp)}
                      </time>
                    </div>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                    {showDetailedHistory && (
                      <p className="text-xs text-muted-foreground">by {event.user}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkOrderTimeline;

