
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X, Edit, Trash2 } from 'lucide-react';
import { useUpdateWorkOrderCost, useDeleteWorkOrderCost } from '@/hooks/useWorkOrderCosts';
import { WorkOrderCost } from '@/services/workOrderCostsService';

interface InlineEditWorkOrderCostProps {
  cost: WorkOrderCost;
  canEdit: boolean;
  showHeaders?: boolean;
}

const InlineEditWorkOrderCost: React.FC<InlineEditWorkOrderCostProps> = ({
  cost,
  canEdit,
  showHeaders = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(cost.description);
  const [editedQuantity, setEditedQuantity] = useState(cost.quantity);
  const [editedUnitPrice, setEditedUnitPrice] = useState(cost.unit_price_cents / 100);

  const updateCostMutation = useUpdateWorkOrderCost();
  const deleteCostMutation = useDeleteWorkOrderCost();

  useEffect(() => {
    if (!isEditing) {
      setEditedDescription(cost.description);
      setEditedQuantity(cost.quantity);
      setEditedUnitPrice(cost.unit_price_cents / 100);
    }
  }, [cost, isEditing]);

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
    try {
      await updateCostMutation.mutateAsync({
        costId: cost.id,
        updateData: {
          description: editedDescription,
          quantity: editedQuantity,
          unit_price_cents: Math.round(editedUnitPrice * 100)
        }
      });
      setIsEditing(false);
    } catch {
      // Error handling is done in the mutation hook
    }
  };

  const handleCancel = () => {
    setEditedDescription(cost.description);
    setEditedQuantity(cost.quantity);
    setEditedUnitPrice(cost.unit_price_cents / 100);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this cost item?')) {
      deleteCostMutation.mutate(cost.id);
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-3">
        {showHeaders && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm font-medium text-muted-foreground px-3">
            <div>Description</div>
            <div>Quantity</div>
            <div>Unit Price</div>
            <div className="text-right">Total</div>
          </div>
        )}
        
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border-2 border-primary">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <Input
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              placeholder="Description"
              className="h-8"
            />
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={editedQuantity}
              onChange={(e) => setEditedQuantity(parseFloat(e.target.value) || 0)}
              placeholder="Qty"
              className="h-8"
            />
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editedUnitPrice}
                onChange={(e) => setEditedUnitPrice(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="h-8"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">
                {formatCurrency(calculateTotal(editedQuantity, Math.round(editedUnitPrice * 100)))}
              </span>
              <div className="flex gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  disabled={updateCostMutation.isPending}
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={updateCostMutation.isPending}
                >
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showHeaders && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm font-medium text-muted-foreground px-3">
          <div>Description</div>
          <div>Quantity</div>
          <div>Unit Price</div>
          <div className="text-right">Total</div>
        </div>
      )}
      
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div>
            <div className="font-medium">{cost.description}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Added by {cost.created_by_name} on{' '}
              {new Date(cost.created_at).toLocaleDateString()}
            </div>
          </div>
          <div className="text-sm">
            {cost.quantity}
          </div>
          <div className="text-sm">
            {formatCurrency(cost.unit_price_cents)}
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold">
              {formatCurrency(cost.total_price_cents)}
            </span>
            {canEdit && (
              <div className="flex gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InlineEditWorkOrderCost;
