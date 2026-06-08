import React from 'react';
import { AlertTriangle, Calendar, Clock, MapPin, User, Users, UserX } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ClickableAddress from '@/components/ui/ClickableAddress';
import { cn } from '@/lib/utils';
import { WorkOrderAssignmentHover } from '../WorkOrderAssignmentHover';
import WorkOrderCostSubtotal from '../WorkOrderCostSubtotal';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import type { AssignmentWorkOrderContext } from '@/features/work-orders/hooks/useWorkOrderContextualAssignment';

type WorkOrderDesktopMetadataStripProps = {
  workOrder: WorkOrder;
  assignmentContext: AssignmentWorkOrderContext;
  fmtDate: (value?: string | null) => string;
  isWorkOrderOverdue: boolean;
  canEditAssignment: boolean;
  canEdit: boolean;
};

export const WorkOrderDesktopMetadataStrip: React.FC<WorkOrderDesktopMetadataStripProps> = ({
  workOrder,
  assignmentContext,
  fmtDate,
  isWorkOrderOverdue,
  canEditAssignment,
  canEdit,
}) => {
  const equipmentTeamName = workOrder.equipmentTeamName ?? workOrder.teamName;
  const createdDateValue = workOrder.created_date ?? workOrder.createdDate;
  const dueDateValue = workOrder.due_date ?? workOrder.dueDate;
  const estimatedHoursValue = workOrder.estimated_hours ?? workOrder.estimatedHours;
  const completedDateValue = workOrder.completed_date ?? workOrder.completedDate;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-3 pt-3 border-t">
      <span className="inline-flex items-center gap-1">
        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
        {fmtDate(createdDateValue)}
      </span>

      {dueDateValue && (
        <span className={cn('inline-flex items-center gap-1', isWorkOrderOverdue && 'text-destructive font-medium')}>
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          Due {fmtDate(dueDateValue)}
          {isWorkOrderOverdue && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="h-3 w-3" />
              </TooltipTrigger>
              <TooltipContent>Overdue &mdash; due date has passed</TooltipContent>
            </Tooltip>
          )}
        </span>
      )}

      {equipmentTeamName && (
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate max-w-[12rem]">{equipmentTeamName}</span>
        </span>
      )}

      <WorkOrderAssignmentHover workOrder={assignmentContext} disabled={!canEditAssignment}>
        <span className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground rounded px-1 -mx-1 transition-colors">
          {workOrder.assigneeName ? (
            <>
              <User className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate max-w-[10rem]">{workOrder.assigneeName}</span>
            </>
          ) : (
            <>
              <UserX className="h-3.5 w-3.5 flex-shrink-0" />
              Unassigned
            </>
          )}
        </span>
      </WorkOrderAssignmentHover>

      {workOrder.effectiveLocation && (
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <ClickableAddress
            address={workOrder.effectiveLocation.formattedAddress}
            lat={workOrder.effectiveLocation.lat}
            lng={workOrder.effectiveLocation.lng}
            className="text-sm truncate"
            showIcon={false}
            compact
          />
        </span>
      )}

      {estimatedHoursValue && (
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          Est. {estimatedHoursValue}h
        </span>
      )}

      {completedDateValue && (
        <span className="inline-flex items-center gap-1 text-success">
          Completed {fmtDate(completedDateValue)}
        </span>
      )}

      {canEdit && (
        <WorkOrderCostSubtotal workOrderId={workOrder.id} className="text-sm" hideWhenEmpty />
      )}
    </div>
  );
};
