import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';
import { isOverdue, isTerminalStatus } from '@/features/work-orders/utils/workOrderHelpers';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { getWorkOrderStatusBorderWithOverdue, getStatusBackgroundTint } from '@/lib/status-colors';
import PMProgressIndicator from '../PMProgressIndicator';
import { WorkOrderPrimaryActionButton } from '../WorkOrderPrimaryActionButton';
import {
  getAssignmentContext,
  mapToWorkOrderData,
} from '@/features/work-orders/utils/workOrderCardMappers';
import { WorkOrderDesktopMetadataStrip } from './WorkOrderDesktopMetadataStrip';
import { WorkOrderDesktopIdentityStrip } from './WorkOrderDesktopIdentityStrip';
import {
  getWorkOrderCardNavigationProps,
  WORK_ORDER_CARD_NAVIGABLE_CLASS,
} from './workOrderCardNavigation';
import type { WorkOrderCardProps } from '../WorkOrderCard';

export const WorkOrderDesktopCard: React.FC<WorkOrderCardProps> = memo(({
  workOrder,
  onNavigate,
  isAboveTheFold,
  canDelete = false,
  onDeleteClick,
}) => {
  const { formatDate } = useFormatTimestamp();
  const fmtDate = (v?: string | null) => (v ? formatDate(v) : '—');
  const permissions = useUnifiedPermissions();
  const workOrderData = mapToWorkOrderData(workOrder);
  const detailedPermissions = permissions.workOrders.getDetailedPermissions(workOrderData);
  const assignmentContext = getAssignmentContext(workOrder);

  const dueDateValue = workOrder.due_date ?? workOrder.dueDate;
  const isTerminal = isTerminalStatus(workOrder.status);
  const isWorkOrderOverdue = isOverdue(dueDateValue, workOrder.status);
  const statusBorderClass = getWorkOrderStatusBorderWithOverdue(workOrder.status, isWorkOrderOverdue);
  const statusTintClass = getStatusBackgroundTint(workOrder.status, isWorkOrderOverdue);
  const navigationProps = getWorkOrderCardNavigationProps(workOrder.id, onNavigate);

  return (
    <Card
      className={cn(
        'transition-all duration-normal',
        statusBorderClass,
        statusTintClass,
        isTerminal && 'opacity-70',
        onNavigate && WORK_ORDER_CARD_NAVIGABLE_CLASS,
      )}
      {...navigationProps}
    >
      <CardContent standalone>
        <WorkOrderDesktopIdentityStrip workOrder={workOrder} isAboveTheFold={isAboveTheFold} />

        <WorkOrderDesktopMetadataStrip
          workOrder={workOrder}
          assignmentContext={assignmentContext}
          fmtDate={fmtDate}
          isWorkOrderOverdue={isWorkOrderOverdue}
          canEditAssignment={detailedPermissions.canEditAssignment}
          canEdit={detailedPermissions.canEdit}
        />

        {workOrder.has_pm && !isTerminal && (
          <div className="mt-3">
            <PMProgressIndicator
              workOrderId={workOrder.id}
              hasPM={workOrder.has_pm}
              showCount
            />
          </div>
        )}

        {(canDelete && onDeleteClick) || !isTerminal ? (
          <div
            className="flex items-center justify-end gap-2 mt-3 pt-3 border-t"
            role="group"
            aria-label="Work order actions"
          >
            {canDelete && onDeleteClick ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label="Delete work order"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteClick(workOrder);
                }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            ) : null}
            {!isTerminal ? (
              <WorkOrderPrimaryActionButton
                workOrder={{
                  id: workOrder.id,
                  status: workOrder.status,
                  has_pm: workOrder.has_pm,
                  assignee_id: workOrder.assignee_id ?? workOrder.assigneeId,
                  created_by: workOrder.created_by,
                }}
                organizationId={workOrder.organization_id ?? workOrder.organizationId}
              />
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
});

WorkOrderDesktopCard.displayName = 'WorkOrderDesktopCard';
