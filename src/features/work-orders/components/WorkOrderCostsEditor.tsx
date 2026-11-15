import React, { useCallback } from 'react';
import {
  calculateWorkOrderCostsSubtotal,
  formatWorkOrderCostCurrency,
} from '@/features/work-orders/utils/workOrderCostFormatters';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { WorkOrderCostItem } from '@/features/work-orders/hooks/useWorkOrderCostsState';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileCostItem from './MobileCostItem';
import DesktopCostItem from './DesktopCostItem';
import { WorkOrderCostLineList } from './WorkOrderCostLineList';

interface WorkOrderCostsEditorProps {
  costs: WorkOrderCostItem[];
  onAddCost: () => void;
  onRemoveCost: (id: string) => void;
  onUpdateCost: (id: string, field: keyof WorkOrderCostItem, value: string | number) => void;
  hasError?: boolean;
  /**
   * When true on mobile, hides the duplicate “Cost Items” + inline Add strip — parent supplies CTAs.
   */
  suppressMobileChrome?: boolean;
}

const WorkOrderCostsEditor: React.FC<WorkOrderCostsEditorProps> = ({
  costs,
  onAddCost,
  onRemoveCost,
  onUpdateCost,
  hasError = false,
  suppressMobileChrome = false,
}) => {
  const isMobile = useIsMobile();
  const showMobileHeaderStrip = !(isMobile && suppressMobileChrome);
  
  const formatCurrency = formatWorkOrderCostCurrency;

  const calculateSubtotal = useCallback(() => {
    return calculateWorkOrderCostsSubtotal(costs);
  }, [costs]);

  const canRemove = costs.length > 1;

  return (
    <div className="space-y-4 overflow-x-hidden">
      {showMobileHeaderStrip ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Cost Items
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={onAddCost}>
            <Plus className="h-4 w-4 mr-1" />
            Add Cost Item
          </Button>
        </div>
      ) : null}

      {hasError ? (
        <p className="text-sm text-destructive" role="alert">
          All cost items must have a description and valid quantities/prices
        </p>
      ) : null}

      <WorkOrderCostLineList
        costs={costs}
        isMobile={isMobile}
        formatCurrency={formatCurrency}
        calculateSubtotal={calculateSubtotal}
        renderMobileCost={(cost) => (
          <MobileCostItem
            cost={cost}
            onRemoveCost={onRemoveCost}
            onUpdateCost={onUpdateCost}
            canRemove={canRemove}
          />
        )}
        renderDesktopCost={(cost) => (
          <DesktopCostItem
            cost={cost}
            onRemoveCost={onRemoveCost}
            onUpdateCost={onUpdateCost}
            canRemove={canRemove}
          />
        )}
        showSubtotal={costs.length > 0}
        className="space-y-3"
      />
    </div>
  );
};

export default WorkOrderCostsEditor;
