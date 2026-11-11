import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ClipboardList } from 'lucide-react';
import { useEquipmentOpenWorkOrders } from '@/features/equipment/hooks/useEquipmentOpenWorkOrders';
import { formatStatus, getPriorityTextColor } from '@/features/work-orders/utils/workOrderHelpers';
import { persistDashboardOrganizationSelection } from '@/utils/organizationSelection';
import { cn } from '@/lib/utils';

interface EquipmentQROpenWorkOrdersProps {
  organizationId: string;
  equipmentId: string;
}

/**
 * Open work orders on the scanned machine, shown next to the "report issue"
 * action so a technician can see the problem is already written up.
 */
const EquipmentQROpenWorkOrders: React.FC<EquipmentQROpenWorkOrdersProps> = ({
  organizationId,
  equipmentId,
}) => {
  const { data, isLoading, isError } = useEquipmentOpenWorkOrders(organizationId, equipmentId);

  if (isLoading) {
    return <div className="h-11 animate-pulse rounded-lg border bg-muted/40" aria-hidden="true" />;
  }

  // Never block the scan page on this list.
  if (isError || !data) return null;

  const { items, total } = data;

  return (
    <section
      aria-labelledby="qr-open-work-orders-heading"
      data-testid="qr-open-work-orders"
      className={cn(
        'rounded-lg border',
        total > 0 ? 'border-warning/40 bg-warning/5' : 'bg-muted/30',
      )}
    >
      <h2
        id="qr-open-work-orders-heading"
        className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold"
      >
        <ClipboardList
          className={cn('h-4 w-4', total > 0 ? 'text-warning' : 'text-muted-foreground')}
          aria-hidden
        />
        {total === 0
          ? 'No open work orders on this machine'
          : `${total} open work order${total === 1 ? '' : 's'} on this machine`}
      </h2>
      {items.length > 0 ? (
        <ul className="divide-y divide-border/50 border-t border-border/50">
          {items.map((workOrder) => (
            <li key={workOrder.id}>
              <Link
                to={`/dashboard/work-orders/${workOrder.id}`}
                reloadDocument
                onClick={() => persistDashboardOrganizationSelection(organizationId)}
                className="flex min-h-[44px] items-center gap-2 px-3 py-2 text-sm hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{workOrder.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatStatus(workOrder.status)}
                    <span aria-hidden> • </span>
                    <span className={getPriorityTextColor(workOrder.priority)}>
                      {workOrder.priority.charAt(0).toUpperCase() + workOrder.priority.slice(1)} priority
                    </span>
                    {workOrder.has_pm ? <span> • PM</span> : null}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {total > items.length ? (
        <p className="border-t border-border/50 px-3 py-2 text-xs text-muted-foreground">
          Showing the {items.length} most recent.
        </p>
      ) : null}
    </section>
  );
};

export default EquipmentQROpenWorkOrders;
