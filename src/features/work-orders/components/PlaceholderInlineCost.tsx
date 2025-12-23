
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X } from 'lucide-react';
import { useCreateWorkOrderCost } from '@/features/work-orders/hooks/useWorkOrderCosts';

interface PlaceholderInlineCostProps {
  workOrderId: string;
  onCancel: () => void;
}

const PlaceholderInlineCost: React.FC<PlaceholderInlineCostProps> = ({
  workOrderId,
  onCancel
}) => {
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  const createCostMutation = useCreateWorkOrderCost();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(cents / 100);
  };

  const calculateTotal = (quantity: number, unitPriceCents: number) => {
    return quantity * unitPriceCents;
  };

  const handleSave = async () => {
    if (!description.trim()) {
      return; // Don't save if description is empty
    }

    try {
      await createCostMutation.mutateAsync({
        work_order_id: workOrderId,
        description: description.trim(),
        quantity: quantity,
        unit_price_cents: Math.round(unitPrice * 100)
      });
      onCancel(); // Close the placeholder after successful save
    } catch {
      // Error handling is done in the mutation hook
    }
  };

  const handleCancel = () => {
    setDescription('');
    setQuantity(1);
    setUnitPrice(0);
    onCancel();
  };

  return (
    <div className="space-y-3">
      {/* Column Headers */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm font-medium text-muted-foreground px-3">
        <div>Description</div>
        <div>Quantity</div>
        <div>Unit Price</div>
        <div className="text-right">Total</div>
      </div>

      {/* Input Row */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description..."
            className="h-8"
            autoFocus
          />
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
            placeholder="Qty"
            className="h-8"
          />
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={unitPrice}
              onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="h-8"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">
              {formatCurrency(calculateTotal(quantity, Math.round(unitPrice * 100)))}
            </span>
            <div className="flex gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={createCostMutation.isPending || !description.trim()}
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={createCostMutation.isPending}
              >
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderInlineCost;
