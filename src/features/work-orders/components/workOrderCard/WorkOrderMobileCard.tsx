import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, ChevronRight } from 'lucide-react';
import {
  formatWorkOrderMachineHours,
  formatWorkOrderPriorityLabel,
} from '@/features/work-orders/utils/workOrderEquipmentVisuals';
import { cn } from '@/lib/utils';
import {
  getStatusColor,
  formatStatus,
  isOverdue,
  isTerminalStatus,
} from '@/features/work-orders/utils/workOrderHelpers';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { getPriorityBadgeClass, getWorkOrderStatusBorderWithOverdue, getStatusBackgroundTint } from '@/lib/status-colors';
import WorkOrderCostSubtotal from '../WorkOrderCostSubtotal';
import PMProgressIndicator from '../PMProgressIndicator';
import QuickBooksInvoiceStatusBadge from '../QuickBooksInvoiceStatusBadge';
import { PendingSyncBadge } from '@/features/offline-queue/components/PendingSyncBadge';
import type { MergedWorkOrder } from '@/features/work-orders/hooks/useOfflineMergedWorkOrders';
import { getAssigneeInitials } from '@/features/work-orders/utils/workOrderCardMappers';
import { WorkOrderEquipmentThumbnail } from './WorkOrderEquipmentThumbnail';
import type { WorkOrderCardProps } from '../WorkOrderCard';

type WorkOrderMobileCardProps = Pick<WorkOrderCardProps, 'workOrder' | 'onNavigate' | 'isAboveTheFold'>;

export const WorkOrderMobileCard: React.FC<WorkOrderMobileCardProps> = memo(({
  workOrder,
  onNavigate,
  isAboveTheFold,
}) => {
  const { formatRelative } = useFormatTimestamp();
  const dueDateValue = workOrder.dueDate ?? workOrder.due_date;
  const createdDateValue = workOrder.createdDate ?? workOrder.created_date;
  const machineHours = formatWorkOrderMachineHours(workOrder.equipmentWorkingHours);
  const isTerminal = isTerminalStatus(workOrder.status);

  const assigneeName =
    workOrder.assigneeName ??
    workOrder.assignee_name ??
    workOrder.assignedTo?.name ??
    undefined;

  const initials = useMemo(() => getAssigneeInitials(assigneeName), [assigneeName]);

  const isInteractive = Boolean(onNavigate);
  const isWorkOrderOverdue = isOverdue(dueDateValue, workOrder.status);
  const statusBorderClass = getWorkOrderStatusBorderWithOverdue(workOrder.status, isWorkOrderOverdue);
  const statusTintClass = getStatusBackgroundTint(workOrder.status, isWorkOrderOverdue);

  const dateLabel = dueDateValue
    ? (isWorkOrderOverdue ? `Overdue ${formatRelative(dueDateValue)}` : `Due ${formatRelative(dueDateValue)}`)
    : formatRelative(createdDateValue);

  return (
    <Card
      className={cn(
        'transition-all duration-normal',
        statusBorderClass,
        statusTintClass,
        isTerminal && 'opacity-70',
        isInteractive && 'hover:shadow-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? () => onNavigate!(workOrder.id) : undefined}
      onKeyDown={isInteractive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onNavigate!(workOrder.id);
        }
      } : undefined}
    >
      <CardContent standalone className="p-2.5">
        <div className="flex items-start gap-2">
          <WorkOrderEquipmentThumbnail
            imageUrl={workOrder.equipmentImageUrl}
            equipmentName={workOrder.equipmentName}
            equipmentAltContext={workOrder.title}
            className="h-11 w-11 rounded-lg flex-shrink-0"
            iconClassName="h-5 w-5"
            isAboveTheFold={isAboveTheFold}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-1.5">
              <CardTitle className="text-sm font-semibold leading-snug line-clamp-2 min-w-0">
                {workOrder.title}
              </CardTitle>
              <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-1">
                <Badge
                  className={cn(getStatusColor(workOrder.status), 'rounded-full px-1.5 py-0 text-[10px] leading-4')}
                  variant="outline"
                >
                  {formatStatus(workOrder.status)}
                </Badge>
                {workOrder.priority && workOrder.priority !== 'medium' && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'rounded-full px-1.5 py-0 text-[10px] leading-4 capitalize',
                      getPriorityBadgeClass(workOrder.priority),
                    )}
                  >
                    {formatWorkOrderPriorityLabel(workOrder.priority)}
                  </Badge>
                )}
              </div>
            </div>
            {workOrder.equipmentName && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {workOrder.equipmentName}
                {machineHours && <span className="ml-1">&bull; {machineHours}</span>}
              </p>
            )}
            {((workOrder.invoiceStatus ?? workOrder.invoice_status) ||
              (workOrder as MergedWorkOrder)._isPendingSync) && (
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <QuickBooksInvoiceStatusBadge
                  status={workOrder.invoiceStatus ?? workOrder.invoice_status}
                  invoiceNumber={workOrder.quickbooksInvoiceNumber ?? workOrder.quickbooks_invoice_number}
                  balanceCents={workOrder.invoiceBalanceCents ?? workOrder.invoice_balance_cents}
                  paidAt={workOrder.invoicePaidAt ?? workOrder.invoice_paid_at}
                  className="rounded-full px-1.5 py-0 text-[10px]"
                />
                {(workOrder as MergedWorkOrder)._isPendingSync && (
                  <PendingSyncBadge className="flex-shrink-0 text-[10px]" />
                )}
              </div>
            )}
          </div>
        </div>

        {workOrder.has_pm && !isTerminal && (
          <div className="mt-1.5">
            <PMProgressIndicator
              workOrderId={workOrder.id}
              hasPM={workOrder.has_pm}
              showCount
              variant="compact"
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t">
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar className="h-5 w-5 flex-shrink-0">
              <AvatarFallback className="text-[9px]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              {assigneeName || 'Unassigned'}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <span className={cn(
              'text-[11px] text-muted-foreground inline-flex items-center gap-0.5',
              isWorkOrderOverdue && 'text-destructive font-medium',
            )}>
              <Calendar className="h-3 w-3" />
              {dateLabel}
            </span>
            <WorkOrderCostSubtotal workOrderId={workOrder.id} className="text-[11px] flex-shrink-0" hideWhenEmpty />
            {isInteractive && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

WorkOrderMobileCard.displayName = 'WorkOrderMobileCard';
