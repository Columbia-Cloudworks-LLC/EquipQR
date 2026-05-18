
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Package } from 'lucide-react';
import { WorkOrderCostItem } from '@/features/work-orders/hooks/useWorkOrderCostsState';

// Hoisted formatter — avoids recreating Intl.NumberFormat on every render
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});
const formatCurrency = (cents: number) => currencyFormatter.format(cents / 100);

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
    <div className={`rounded-lg p-4 space-y-3 ${isFromInventory ? 'bg-info/10 dark:bg-info/15 border border-info/30 dark:border-info/40' : 'bg-muted/50'}`}>
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
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <Input
        value={cost.description}
        onChange={(e) => onUpdateCost(cost.id, 'description', e.target.value)}
        placeholder="Enter description..."
        className="h-9"
        readOnly={isFromInventory}
      />
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-muted-foreground block mb-1">
            Quantity
          </label>
          <Input
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
          <label className="text-sm font-medium text-muted-foreground block mb-1">
            Unit Price
          </label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={cost.unit_price_cents / 100}
              onChange={(e) => onUpdateCost(cost.id, 'unit_price_cents', Math.round((parseFloat(e.target.value) || 0) * 100))}
              placeholder="0.00"
              className="h-9"
            />
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-2 border-t">
        <span className="text-sm font-medium text-muted-foreground">Total:</span>
        <span className="font-semibold text-lg">
          {formatCurrency(cost.total_price_cents)}
        </span>
      </div>
    </div>
  );
});

MobileCostItem.displayName = 'MobileCostItem';

export default MobileCostItem;

