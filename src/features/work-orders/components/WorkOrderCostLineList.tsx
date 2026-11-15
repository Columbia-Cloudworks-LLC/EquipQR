import React from 'react';
import { cn } from '@/lib/utils';

export type WorkOrderCostLineListProps<T extends { id: string }> = {
  costs: T[];
  isMobile: boolean;
  formatCurrency: (cents: number) => string;
  calculateSubtotal: () => number;
  renderMobileCost: (cost: T) => React.ReactNode;
  renderDesktopCost: (cost: T) => React.ReactNode;
  /** Defaults to true. The editor hides the subtotal while the list is empty. */
  showSubtotal?: boolean;
  className?: string;
};

/**
 * Cost line layout shared by the read-only cost list and the cost editor:
 * desktop column headers, one row per cost, then the subtotal.
 */
export function WorkOrderCostLineList<T extends { id: string }>({
  costs,
  isMobile,
  formatCurrency,
  calculateSubtotal,
  renderMobileCost,
  renderDesktopCost,
  showSubtotal = true,
  className,
}: WorkOrderCostLineListProps<T>) {
  return (
    <div className={cn(className)}>
      {!isMobile && (
        <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground px-3">
          <div>Description</div>
          <div>Quantity</div>
          <div>Unit Price</div>
          <div className="text-right">Total</div>
        </div>
      )}

      <div className="space-y-3">
        {costs.map((cost) => (
          <div key={cost.id}>
            {isMobile ? renderMobileCost(cost) : renderDesktopCost(cost)}
          </div>
        ))}
      </div>

      {showSubtotal && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Subtotal:</span>
            <span>{formatCurrency(calculateSubtotal())}</span>
          </div>
        </div>
      )}
    </div>
  );
}
