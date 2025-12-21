
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';
import { WorkOrderCostItem } from '@/features/work-orders/hooks/useWorkOrderCostsState';

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
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(cents / 100);
  };

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Description</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemoveCost(cost.id)}
          className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
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


