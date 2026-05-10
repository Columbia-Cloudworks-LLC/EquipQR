import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Users, AlertCircle, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatStatus,
  getPriorityColor,
  getStatusColor,
  isOverdue as checkIsOverdue,
} from '@/features/work-orders/utils/workOrderHelpers';
import { getStatusDisplayInfo as getEquipmentStatusDisplayInfo } from '@/features/equipment/utils/equipmentHelpers';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';

export interface MobileWorkOrderCompactSummaryProps {
  workOrder: {
    status:
      | 'submitted'
      | 'accepted'
      | 'assigned'
      | 'in_progress'
      | 'on_hold'
      | 'completed'
      | 'cancelled';
    priority: 'low' | 'medium' | 'high';
    due_date?: string;
  };
  equipment?: {
    id: string;
    name: string;
    status: string;
  } | null;
  team?: { id: string; name: string } | null;
  assignee?: { name: string } | null;
}

export const MobileWorkOrderCompactSummary: React.FC<MobileWorkOrderCompactSummaryProps> = ({
  workOrder,
  equipment,
  team,
  assignee,
}) => {
  const { formatDate } = useFormatTimestamp();
  const dueDate = workOrder.due_date;
  const overdue = !!(dueDate && checkIsOverdue(dueDate, workOrder.status));
  const dueSoon =
    !!(dueDate && !overdue && (() => {
      const due = new Date(dueDate);
      const hoursUntilDue = (due.getTime() - Date.now()) / (1000 * 60 * 60);
      return hoursUntilDue > 0 && hoursUntilDue < 24;
    })());

  const equipStatus =
    equipment != null ? getEquipmentStatusDisplayInfo(equipment.status || 'active') : null;

  return (
    <Card className="border-border/80 shadow-elevation-2 lg:hidden">
      <CardContent className="p-4 space-y-3">
        {/* Line 1: status + priority + due/overdue emphasis */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`${getStatusColor(workOrder.status)} rounded-full px-2.5 py-1 text-xs font-semibold min-h-[32px]`}>
            {formatStatus(workOrder.status)}
          </Badge>
          <Badge
            variant="outline"
            className={`rounded-full px-2 py-0.5 text-xs capitalize ${getPriorityColor(workOrder.priority)}`}
          >
            {workOrder.priority} priority
          </Badge>

          {dueDate && (
            <div
              className={cn(
                'ml-auto flex min-w-0 flex-wrap items-center gap-1.5 font-semibold text-base',
                overdue && 'text-destructive',
                dueSoon && !overdue && 'text-warning'
              )}
              aria-live="polite"
            >
              {overdue ? (
                <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
              ) : dueSoon ? (
                <AlertTriangle className="h-5 w-5 shrink-0 text-warning" aria-hidden />
              ) : (
                <Clock className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="truncate">{formatDate(dueDate)}</span>
              {overdue && (
                <Badge
                  variant="outline"
                  className="shrink-0 border-destructive/40 bg-destructive/15 text-base font-semibold text-destructive"
                >
                  OVERDUE
                </Badge>
              )}
              {dueSoon && !overdue && (
                <Badge
                  variant="outline"
                  className="shrink-0 border-warning/40 bg-warning/15 text-sm font-semibold text-warning"
                >
                  DUE SOON
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Line 2: equipment */}
        {equipment && (
          <div className="flex flex-wrap items-center gap-2 text-base font-semibold">
            <span className="text-muted-foreground text-sm font-medium">Equipment</span>
            <Link
              to={`/dashboard/equipment/${equipment.id}`}
              className="text-primary underline-offset-4 hover:underline min-h-[44px] inline-flex items-center py-2"
            >
              {equipment.name}
            </Link>
            {equipStatus && (
              <Badge variant="outline" className={`${equipStatus.badgeClassName} rounded-full text-xs`}>
                {equipStatus.label}
              </Badge>
            )}
          </div>
        )}

        {/* Line 3: team + assignee */}
        {(team || assignee) && (
          <div className="space-y-1.5 text-base">
            {team && (
              <div className="flex flex-wrap items-center gap-2 min-h-[44px]">
                <Users className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                <Link to={`/dashboard/teams/${team.id}`} className="font-semibold text-primary hover:underline">
                  {team.name}
                </Link>
              </div>
            )}
            {assignee && (
              <div className="text-muted-foreground">
                <span className="sr-only">Assignee:</span>
                <span className="font-medium text-foreground">Assigned to</span>{' '}
                <span className="text-base">{assignee.name}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
