
import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { WorkOrderCostItem } from '@/features/work-orders/hooks/useWorkOrderCostsState';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileCostItem from './MobileCostItem';
import DesktopCostItem from './DesktopCostItem';

interface WorkOrderCostsEditorProps {
  costs: WorkOrderCostItem[];
  onAddCost: () => void;
  onRemoveCost: (id: string) => void;
  onUpdateCost: (id: string, field: keyof WorkOrderCostItem, value: string | number) => void;
  hasError?: boolean;
}

const WorkOrderCostsEditor: React.FC<WorkOrderCostsEditorProps> = ({
  costs,
  onAddCost,
  onRemoveCost,
  onUpdateCost,
  hasError = false
}) => {
  const isMobile = useIsMobile();
  
  const formatCurrency = useCallback((cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(cents / 100);
  }, []);

  const calculateSubtotal = useCallback(() => {
    return costs.reduce((sum, cost) => sum + cost.total_price_cents, 0);
  }, [costs]);

  const canRemove = costs.length > 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Cost Items
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddCost}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Cost Item
        </Button>
      </div>

      {hasError && (
        <p className="text-sm text-destructive">
          All cost items must have a description and valid quantities/prices
        </p>
      )}

      <div className="space-y-3">
        {/* Desktop Headers */}
        {!isMobile && (
          <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground px-3">
            <div>Description</div>
            <div>Quantity</div>
            <div>Unit Price</div>
            <div className="text-right">Total</div>
          </div>
        )}

        {/* Cost Items */}
        <div className="space-y-3">
          {costs.map((cost) => (
            <div key={cost.id}>
              {isMobile ? (
                <MobileCostItem 
                  cost={cost}
                  onRemoveCost={onRemoveCost}
                  onUpdateCost={onUpdateCost}
                  canRemove={canRemove}
                />
              ) : (
                <DesktopCostItem 
                  cost={cost}
                  onRemoveCost={onRemoveCost}
                  onUpdateCost={onUpdateCost}
                  canRemove={canRemove}
                />
              )}
            </div>
          ))}
        </div>

        {/* Subtotal */}
        {costs.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Subtotal:</span>
              <span>{formatCurrency(calculateSubtotal())}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkOrderCostsEditor;


