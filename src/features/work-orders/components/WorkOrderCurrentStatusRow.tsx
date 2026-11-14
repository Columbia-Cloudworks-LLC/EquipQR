import React from 'react';
import { Badge } from '@/components/ui/badge';
import { formatStatus, getWorkOrderStatusColor } from '@/features/work-orders/utils/workOrderHelpers';

/** "Current Status:" label with the colored status badge, shown at the top of the status cards. */
export function WorkOrderCurrentStatusRow({ status }: { status: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">Current Status:</span>
      <Badge className={getWorkOrderStatusColor(status)}>
        {formatStatus(status)}
      </Badge>
    </div>
  );
}
