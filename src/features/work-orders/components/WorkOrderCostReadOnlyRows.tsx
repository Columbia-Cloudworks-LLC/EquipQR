import React from 'react';
import { Package, Clock } from 'lucide-react';
import { WorkOrderCost } from '@/features/work-orders/services/workOrderCostsService';
import { isLaborCostRow } from '@/features/work-orders/utils/isLaborCostRow';
import { formatWorkOrderCostCurrency } from '@/features/work-orders/utils/workOrderCostFormatters';

export type WorkOrderCostReadOnlyRowProps = {
  cost: WorkOrderCost;
  formatDate: (value: string) => string;
};

export function WorkOrderCostMobileReadOnlyRow({ cost, formatDate }: WorkOrderCostReadOnlyRowProps) {
  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium text-sm flex items-center gap-1.5">
            {cost.inventory_item_id && (
              <Package className="h-3.5 w-3.5 text-info flex-shrink-0" aria-label="From inventory" />
            )}
            {!cost.inventory_item_id && isLaborCostRow(cost) && (
              <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" aria-label="Labor" />
            )}
            {cost.description}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Added by {cost.created_by_name} • {formatDate(cost.created_at)}
            {cost.inventory_item_id && <span className="ml-1 text-info">(Inventory)</span>}
          </div>
        </div>
        <div className="text-right ml-2">
          <div className="font-semibold text-lg">
            {formatWorkOrderCostCurrency(cost.total_price_cents)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
        <div>Qty: {cost.quantity}</div>
        <div>Unit: {formatWorkOrderCostCurrency(cost.unit_price_cents)}</div>
      </div>
    </div>
  );
}

export function WorkOrderCostDesktopReadOnlyRow({ cost, formatDate }: WorkOrderCostReadOnlyRowProps) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
      <div className="grid grid-cols-4 gap-4 items-center">
        <div>
          <div className="font-medium flex items-center gap-1.5">
            {cost.inventory_item_id && (
              <Package className="h-4 w-4 text-info flex-shrink-0" aria-label="From inventory" />
            )}
            {!cost.inventory_item_id && isLaborCostRow(cost) && (
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-label="Labor" />
            )}
            {cost.description}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Added by {cost.created_by_name} on{' '}
            {formatDate(cost.created_at)}
            {cost.inventory_item_id && <span className="ml-1 text-info">(Inventory)</span>}
          </div>
        </div>
        <div className="text-sm">{cost.quantity}</div>
        <div className="text-sm">{formatWorkOrderCostCurrency(cost.unit_price_cents)}</div>
        <div className="font-semibold text-right">
          {formatWorkOrderCostCurrency(cost.total_price_cents)}
        </div>
      </div>
    </div>
  );
}
