
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';
import { WorkOrderCostItem } from '@/features/work-orders/hooks/useWorkOrderCostsState';

interface DesktopCostItemProps {
  cost: WorkOrderCostItem;
  onRemoveCost: (id: string) => void;
  onUpdateCost: (id: string, field: keyof WorkOrderCostItem, value: string | number) => void;
  canRemove: boolean;
}

const DesktopCostItem: React.FC<DesktopCostItemProps> = React.memo(({
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
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex-1 grid grid-cols-4 gap-4 items-center">
        <Input
          value={cost.description}
          onChange={(e) => onUpdateCost(cost.id, 'description', e.target.value)}
          placeholder="Enter description..."
          className="h-8"
        />
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={cost.quantity}
          onChange={(e) => onUpdateCost(cost.id, 'quantity', parseFloat(e.target.value) || 1)}
          placeholder="Qty"
          className="h-8"
        />
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">$</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={cost.unit_price_cents / 100}
            onChange={(e) => onUpdateCost(cost.id, 'unit_price_cents', Math.round((parseFloat(e.target.value) || 0) * 100))}
            placeholder="0.00"
            className="h-8"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">
            {formatCurrency(cost.total_price_cents)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemoveCost(cost.id)}
            className="text-red-600 hover:text-red-700"
            disabled={!canRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

DesktopCostItem.displayName = 'DesktopCostItem';

export default DesktopCostItem;


