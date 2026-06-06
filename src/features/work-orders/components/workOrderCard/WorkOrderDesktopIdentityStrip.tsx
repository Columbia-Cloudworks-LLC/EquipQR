import React from 'react';
import { CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatWorkOrderMachineHours, formatWorkOrderPriorityLabel } from '@/features/work-orders/utils/workOrderEquipmentVisuals';
import { cn } from '@/lib/utils';
import { getStatusColor, formatStatus } from '@/features/work-orders/utils/workOrderHelpers';
import { getPriorityBadgeClass } from '@/lib/status-colors';
import { WorkOrderQuickActions } from '../WorkOrderQuickActions';
import QuickBooksInvoiceStatusBadge from '../QuickBooksInvoiceStatusBadge';
import { PendingSyncBadge } from '@/features/offline-queue/components/PendingSyncBadge';
import type { MergedWorkOrder } from '@/features/work-orders/hooks/useOfflineMergedWorkOrders';
import type { WorkOrder } from '@/features/work-orders/types/workOrder';
import { WorkOrderEquipmentThumbnail } from './WorkOrderEquipmentThumbnail';

type WorkOrderDesktopIdentityStripProps = {
  workOrder: WorkOrder;
  isAboveTheFold?: boolean;
};

export const WorkOrderDesktopIdentityStrip: React.FC<WorkOrderDesktopIdentityStripProps> = ({
  workOrder,
  isAboveTheFold,
}) => {
  const machineHours = formatWorkOrderMachineHours(workOrder.equipmentWorkingHours);
  const showDescription = workOrder.description && workOrder.description !== workOrder.title;
  const equipmentLine = [workOrder.equipmentModel, machineHours].filter(Boolean).join(' \u2022 ');

  return (
    <div className="flex items-start gap-4">
      <WorkOrderEquipmentThumbnail
        imageUrl={workOrder.equipmentImageUrl}
        equipmentName={workOrder.equipmentName}
        equipmentAltContext={workOrder.title}
        className="h-24 w-24 rounded-xl flex-shrink-0"
        iconClassName="h-10 w-10"
        isAboveTheFold={isAboveTheFold}
      />
      <div className="min-w-0 flex-1">
        <CardTitle className="text-lg font-semibold leading-tight">
          {workOrder.title}
        </CardTitle>
        {showDescription && (
          <p className="text-sm text-muted-foreground mt-0.5 truncate">
            {workOrder.description}
          </p>
        )}
        {workOrder.equipmentName && (
          <p className="text-sm text-muted-foreground mt-1">
            {workOrder.equipmentName}
            {equipmentLine && <span className="ml-1.5 text-xs">{equipmentLine}</span>}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div onClick={(e) => e.stopPropagation()}>
          <WorkOrderQuickActions
            workOrderId={workOrder.id}
            workOrderStatus={workOrder.status}
            equipmentTeamId={workOrder.equipmentTeamId ?? workOrder.team_id}
          />
        </div>
        <Badge className={getStatusColor(workOrder.status)}>
          {formatStatus(workOrder.status)}
        </Badge>
        <Badge
          variant="outline"
          className={cn('capitalize', getPriorityBadgeClass(workOrder.priority))}
        >
          {formatWorkOrderPriorityLabel(workOrder.priority)}
        </Badge>
        <QuickBooksInvoiceStatusBadge
          status={workOrder.invoiceStatus ?? workOrder.invoice_status}
          invoiceNumber={workOrder.quickbooksInvoiceNumber ?? workOrder.quickbooks_invoice_number}
          balanceCents={workOrder.invoiceBalanceCents ?? workOrder.invoice_balance_cents}
          paidAt={workOrder.invoicePaidAt ?? workOrder.invoice_paid_at}
        />
        {(workOrder as MergedWorkOrder)._isPendingSync && <PendingSyncBadge />}
      </div>
    </div>
  );
};
