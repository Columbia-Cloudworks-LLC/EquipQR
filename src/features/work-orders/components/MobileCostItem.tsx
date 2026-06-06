
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Package } from 'lucide-react';
import { WorkOrderCostItem } from '@/features/work-orders/hooks/useWorkOrderCostsState';

import {
  formatWorkOrderCostCurrency,
  parseUnitPriceDollarsToCents,
} from '@/features/work-orders/utils/workOrderCostFormatters';

interface MobileCostItemProps {
  cost: WorkOrderCostItem;
  onRemoveCost: (id: string) => void;
  onUpdateCost: (id: string, field: keyof WorkOrderCostItem, value: string | number) => void;
  canRemove: boolean;
}

const MobileCostItem: React.FC<MobileCostItemProps> = React.memo(({
  cost,
  onRemoveCost,
  onUpdateCost,
  canRemove
}) => {
  const isFromInventory = !!cost.inventory_item_id;

  return (
    <div
      className={`max-w-full min-w-0 space-y-3 rounded-lg p-4 ${isFromInventory ? 'border border-info/30 bg-info/10 dark:border-info/40 dark:bg-info/15' : 'bg-muted/50'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isFromInventory && (
            <Package className="h-4 w-4 text-info" title="From inventory - removing will restore stock" />
          )}
          <span className="text-sm font-medium text-muted-foreground">
            Description {isFromInventory && <span className="text-info">(Inventory)</span>}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemoveCost(cost.id)}
          className="text-destructive hover:text-destructive h-6 w-6 p-0"
          disabled={!canRemove}
          aria-label="Remove cost line"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <Input
        id={`wo-cost-desc-${cost.id}`}
        value={cost.description}
        onChange={(e) => onUpdateCost(cost.id, 'description', e.target.value)}
        placeholder="Enter description..."
        className="h-9"
        readOnly={isFromInventory}
        aria-label="Cost description"
      />
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`wo-cost-qty-${cost.id}`} className="mb-1 block text-sm font-medium text-muted-foreground">
            Quantity
          </label>
          <Input
            id={`wo-cost-qty-${cost.id}`}
            type="number"
            step="0.01"
            min="0.01"
            value={cost.quantity}
            onChange={(e) => onUpdateCost(cost.id, 'quantity', parseFloat(e.target.value) || 1)}
            placeholder="Qty"
            className="h-9"
          />
        </div>
        
        <div>
          <label htmlFor={`wo-cost-unit-${cost.id}`} className="mb-1 block text-sm font-medium text-muted-foreground">
            Unit Price
          </label>
          <div className="flex min-w-0 items-center gap-1">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              id={`wo-cost-unit-${cost.id}`}
              type="number"
              step="0.01"
              min="0"
              value={cost.unit_price_cents / 100}
              onChange={(e) => onUpdateCost(cost.id, 'unit_price_cents', parseUnitPriceDollarsToCents(e.target.value))}
              placeholder="0.00"
              className="h-9 min-w-0"
            />
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-2 border-t">
        <span className="text-sm font-medium text-muted-foreground">Total:</span>
        <span className="font-semibold text-lg">
          {formatWorkOrderCostCurrency(cost.total_price_cents)}
        </span>
      </div>
    </div>
  );
});

MobileCostItem.displayName = 'MobileCostItem';

export default MobileCostItem;

