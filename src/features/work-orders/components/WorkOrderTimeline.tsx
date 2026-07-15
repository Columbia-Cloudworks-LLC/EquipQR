
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Clock, CheckCircle, Play, Pause, XCircle, FileText, User, Pencil } from 'lucide-react';
import type { WorkOrder as EnhancedWorkOrder } from '@/features/work-orders/types/workOrder';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { useWorkOrderTimeline } from '@/features/work-orders/hooks/useHistoricalWorkOrders';
import {
  buildCreationDescription,
  getCreationTitle,
  getStatusChangeDescription,
  getStatusChangeTitle,
} from '@/features/work-orders/utils/workOrderTimelineLabels';
import { UserIdentityCard } from '@/components/common/UserIdentityCard';

interface WorkOrderTimelineProps {
  workOrder: EnhancedWorkOrder;
  showDetailedHistory?: boolean;
  headerAction?: React.ReactNode;
}

interface TimelineActor {
  name: string;
  avatarUrl?: string | null;
}

interface TimelineEvent {
  id: string | number;
  title: string;
  description: string;
  timestamp: string;
  type: string;
  icon: React.ElementType;
  actor: TimelineActor;
  isPublic: boolean;
}

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

const WorkOrderTimeline: React.FC<WorkOrderTimelineProps> = ({
  workOrder,
  showDetailedHistory = true,
  headerAction,
}) => {
  const { formatDateTime } = useFormatTimestamp();
  const { data: historyRows = [], isLoading } = useWorkOrderTimeline(workOrder.id);
  const isHistorical = Boolean(workOrder.isHistorical ?? workOrder.is_historical);

  const timelineEvents = useMemo(() => {
    const historyEvents: TimelineEvent[] = historyRows.map((history) => {
      const metadata = history.metadata as { assignee_id?: string } | null;
      const assigneeSuffix =
        history.new_status === 'assigned' && metadata?.assignee_id
          ? ' (assignee recorded)'
          : '';

      return {
        id: history.id,
        title: getStatusChangeTitle(history.old_status, history.new_status),
        description: `${getStatusChangeDescription(history.old_status, history.new_status, history.reason ?? undefined)}${assigneeSuffix}`,
        timestamp: history.changed_at,
        type: history.new_status,
        icon: getStatusIcon(history.new_status),
        actor: {
          name: history.profiles?.name || 'System',
          avatarUrl: history.profiles?.avatar_url ?? null,
        },
        isPublic: true,
      };
    });

    if (isHistorical) {
      return [...historyEvents].sort(
        (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
      );
    }

    const events: TimelineEvent[] = [];
    const historyHasCreation = historyRows.some((row) => row.old_status === null);

    if (!historyHasCreation) {
      events.push({
        id: 'created',
        title: getCreationTitle(workOrder.status, Boolean(workOrder.assigneeName)),
        description: buildCreationDescription({
          status: workOrder.status,
          createdByName: workOrder.createdByName,
          assigneeName: workOrder.assigneeName,
        }),
        timestamp: workOrder.created_date,
        type: workOrder.status,
        icon: getStatusIcon(workOrder.status),
        actor: {
          name: workOrder.createdByName || 'System',
          avatarUrl: workOrder.createdByAvatarUrl ?? null,
        },
        isPublic: true,
      });
    }

    events.push(...historyEvents);

    const mostRecentHistoryStatus = historyEvents[0]?.type;
    const currentStatusAlreadyRepresented =
      historyEvents.length === 0
        ? !historyHasCreation
        : mostRecentHistoryStatus === workOrder.status;

    if (!currentStatusAlreadyRepresented) {
      const previousStatus = mostRecentHistoryStatus ?? null;
      events.push({
        id: 'current',
        title: getStatusChangeTitle(previousStatus, workOrder.status),
        description: getStatusChangeDescription(previousStatus, workOrder.status),
        timestamp: workOrder.updated_at || workOrder.created_date,
        type: workOrder.status,
        icon: getStatusIcon(workOrder.status),
        actor: {
          name: workOrder.assigneeName || historyEvents[0]?.actor.name || 'System',
          avatarUrl:
            workOrder.assignedTo?.avatarUrl ??
            historyEvents[0]?.actor.avatarUrl ??
            null,
        },
        isPublic: true,
      });
    }

    const filteredEvents = showDetailedHistory
      ? events
      : events.filter((event) => event.isPublic);

    return filteredEvents.sort(
      (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
    );
  }, [
    historyRows,
    isHistorical,
    showDetailedHistory,
    workOrder.assigneeName,
    workOrder.assignedTo?.avatarUrl,
    workOrder.createdByAvatarUrl,
    workOrder.createdByName,
    workOrder.created_date,
    workOrder.status,
    workOrder.updated_at,
  ]);

  const timelineHasBeenEdited = historyRows.some((row) => row.is_historical_creation);

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

  return (
    <Card className="shadow-elevation-2">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex flex-wrap items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline
            {timelineHasBeenEdited ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-label="Edited timeline"
                      data-testid="timeline-edited-indicator"
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium">Edited timeline</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      An admin backdated or corrected status events and dates to reflect paper
                      records or actual field history. These timestamps may differ from when changes
                      were recorded in EquipQR.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
            {!showDetailedHistory && (
              <Badge variant="outline" className="text-xs">
                Limited View
              </Badge>
            )}
          </CardTitle>
          {headerAction}
        </div>
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
                <div key={event.id} className="flex gap-4 rounded-lg border border-border/60 bg-card/50 p-3">
                  <div className="flex flex-col items-center">
                    <div className={`rounded-full border p-2 ${getEventColor(event.type)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {!isLast && <div className="mt-2 h-8 w-px bg-border" />}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1 pb-1">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="min-w-0 font-medium">{event.title}</h4>
                      <time className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateTime(event.timestamp)}
                      </time>
                    </div>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                    {showDetailedHistory ? (
                      <UserIdentityCard
                        name={event.actor.name}
                        avatarUrl={event.actor.avatarUrl}
                      />
                    ) : null}
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
