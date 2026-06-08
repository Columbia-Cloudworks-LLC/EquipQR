import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, MapPin, User } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ClickableAddress from '@/components/ui/ClickableAddress';
import { cn } from '@/lib/utils';
import {
  getStatusColor,
  formatStatus,
  isOverdue,
  isTerminalStatus,
} from '@/features/work-orders/utils/workOrderHelpers';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { getWorkOrderStatusBorderWithOverdue } from '@/lib/status-colors';
import PMProgressIndicator from '../PMProgressIndicator';
import {
  getWorkOrderCardNavigationProps,
  WORK_ORDER_CARD_NAVIGABLE_CLASS,
} from './workOrderCardNavigation';
import type { WorkOrderCardProps } from '../WorkOrderCard';

export const WorkOrderCompactCard: React.FC<WorkOrderCardProps> = memo(({
  workOrder,
  onNavigate,
}) => {
  const { formatDate } = useFormatTimestamp();
  const fmtDate = (v?: string | null) => (v ? formatDate(v) : '—');

  const computedData = useMemo(() => {
    const overdueStatus = isOverdue(workOrder.dueDate ?? workOrder.due_date, workOrder.status);
    return {
      isOverdue: overdueStatus,
      formattedDueDate: fmtDate(workOrder.dueDate ?? workOrder.due_date),
      formattedCreatedDate: fmtDate(workOrder.createdDate ?? workOrder.created_date),
      statusBorderClass: getWorkOrderStatusBorderWithOverdue(workOrder.status, overdueStatus),
    };
  }, [workOrder.status, workOrder.dueDate, workOrder.due_date, workOrder.createdDate, workOrder.created_date, formatDate]);

  const isTerminal = isTerminalStatus(workOrder.status);
  const navigationProps = getWorkOrderCardNavigationProps(workOrder.id, onNavigate);

  return (
    <Card
      className={cn(
        'h-full transition-all duration-normal',
        computedData.statusBorderClass,
        onNavigate && WORK_ORDER_CARD_NAVIGABLE_CLASS,
      )}
      {...navigationProps}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg leading-tight line-clamp-2">
              {workOrder.title}
            </CardTitle>
            <span className="text-xs text-muted-foreground capitalize">
              {workOrder.priority} priority
            </span>
          </div>
          <Badge className={getStatusColor(workOrder.status)}>
            {formatStatus(workOrder.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {workOrder.description}
        </p>

        {workOrder.has_pm && !isTerminal && (
          <div className="py-2 border-y">
            <PMProgressIndicator
              workOrderId={workOrder.id}
              hasPM={workOrder.has_pm}
            />
          </div>
        )}

        <div className="space-y-2 text-sm">
          {workOrder.equipmentName && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Equipment:</span>
              <span className="text-muted-foreground truncate">
                {workOrder.equipmentName}
              </span>
            </div>
          )}

          {workOrder.assigneeName && (
            <div className="flex items-center gap-2">
              <User className="h-3 w-3" />
              <span className="text-muted-foreground truncate">
                {workOrder.assigneeName}
              </span>
            </div>
          )}

          {(workOrder.teamName || workOrder.equipmentTeamName) && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Team:</span>
              <span className="text-muted-foreground truncate">
                {workOrder.teamName || workOrder.equipmentTeamName}
              </span>
            </div>
          )}

          {workOrder.effectiveLocation && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <ClickableAddress
                address={workOrder.effectiveLocation.formattedAddress}
                lat={workOrder.effectiveLocation.lat}
                lng={workOrder.effectiveLocation.lng}
                className="text-sm truncate"
                showIcon={false}
                compact
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Created: {computedData.formattedCreatedDate}
          </div>

          {computedData.formattedDueDate !== '—' && (
            <div className={`flex items-center gap-1 ${
              computedData.isOverdue ? 'text-destructive' : ''
            }`}>
              {computedData.isOverdue && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </TooltipTrigger>
                  <TooltipContent>Overdue &mdash; due date has passed</TooltipContent>
                </Tooltip>
              )}
              Due: {computedData.formattedDueDate}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => onNavigate?.(workOrder.id)}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

WorkOrderCompactCard.displayName = 'WorkOrderCompactCard';
