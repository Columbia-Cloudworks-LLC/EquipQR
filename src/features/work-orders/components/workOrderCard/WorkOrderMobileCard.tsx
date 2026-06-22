import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, QrCode } from 'lucide-react';
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
import { WorkOrderQuickActions } from '../WorkOrderQuickActions';
import type { WorkOrderCardProps } from '../WorkOrderCard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type WorkOrderMobileCardProps = Pick<
  WorkOrderCardProps,
  'workOrder' | 'onNavigate' | 'isAboveTheFold' | 'onShowQR'
>;

export const WorkOrderMobileCard: React.FC<WorkOrderMobileCardProps> = memo(({
  workOrder,
  onNavigate,
  isAboveTheFold,
  onShowQR,
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

  const isPendingSync = Boolean((workOrder as MergedWorkOrder)._isPendingSync);
  const showInvoiceRow =
    Boolean(workOrder.invoiceStatus ?? workOrder.invoice_status) || isPendingSync;

  const handleQRClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPendingSync) {
      toast.info('Pending sync', {
        description: 'QR codes and printable worksheets are available after the work order syncs.',
      });
      return;
    }
    onShowQR?.(workOrder);
  };

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
        <div className="grid min-w-0 grid-cols-[2.75rem_1fr_auto] gap-x-2.5 gap-y-1">
          <div className="row-start-1 row-span-2 self-start">
            <WorkOrderEquipmentThumbnail
              imageUrl={workOrder.equipmentImageUrl}
              equipmentName={workOrder.equipmentName}
              equipmentAltContext={workOrder.title}
              className="h-11 w-11 rounded-lg shrink-0"
              iconClassName="h-5 w-5"
              isAboveTheFold={isAboveTheFold}
            />
          </div>

          <div className="col-start-2 row-start-1 min-w-0">
            <CardTitle className="text-sm font-semibold leading-snug line-clamp-2">
              {workOrder.title}
            </CardTitle>
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
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

          {onShowQR ? (
            <div className="col-start-3 row-start-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 -mr-1 text-muted-foreground hover:text-foreground"
                onClick={handleQRClick}
                aria-label={`Show QR code and print options for ${workOrder.title}`}
              >
                <QrCode className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ) : null}

          <div className="col-start-2 row-start-2 min-w-0 space-y-1">
            {workOrder.equipmentName ? (
              <p className="text-xs text-muted-foreground truncate">
                {workOrder.equipmentName}
                {machineHours ? <span className="ml-1">&bull; {machineHours}</span> : null}
              </p>
            ) : null}
            {showInvoiceRow ? (
              <div className="flex flex-wrap items-center gap-1">
                <QuickBooksInvoiceStatusBadge
                  status={workOrder.invoiceStatus ?? workOrder.invoice_status}
                  invoiceNumber={workOrder.quickbooksInvoiceNumber ?? workOrder.quickbooks_invoice_number}
                  balanceCents={workOrder.invoiceBalanceCents ?? workOrder.invoice_balance_cents}
                  paidAt={workOrder.invoicePaidAt ?? workOrder.invoice_paid_at}
                  className="rounded-full px-1.5 py-0 text-[10px]"
                />
                {isPendingSync ? (
                  <PendingSyncBadge className="shrink-0 text-[10px]" />
                ) : null}
              </div>
            ) : null}
          </div>

          {workOrder.has_pm && !isTerminal ? (
            <div className="col-span-3 row-start-3 mt-0.5">
              <PMProgressIndicator
                workOrderId={workOrder.id}
                hasPM={workOrder.has_pm}
                showCount
                variant="compact"
              />
            </div>
          ) : null}

          <div
            className={cn(
              'col-span-3 flex items-end justify-between gap-2 border-t pt-1.5',
              workOrder.has_pm && !isTerminal ? 'row-start-4 mt-0.5' : 'row-start-3 mt-1',
            )}
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarFallback className="text-[9px]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-xs text-muted-foreground">
                  {assigneeName || 'Unassigned'}
                </span>
              </div>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-0.5 text-[11px] text-muted-foreground',
                  isWorkOrderOverdue && 'font-medium text-destructive',
                )}
              >
                <Calendar className="h-3 w-3" aria-hidden />
                {dateLabel}
              </span>
              <WorkOrderCostSubtotal
                workOrderId={workOrder.id}
                className="shrink-0 text-[11px]"
                hideWhenEmpty
              />
            </div>

            <div className="shrink-0 self-end">
              <WorkOrderQuickActions
                workOrderId={workOrder.id}
                workOrderStatus={workOrder.status}
                equipmentTeamId={workOrder.equipmentTeamId ?? workOrder.team_id}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

WorkOrderMobileCard.displayName = 'WorkOrderMobileCard';
