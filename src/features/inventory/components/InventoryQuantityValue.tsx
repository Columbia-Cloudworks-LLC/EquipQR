import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import { getQuantityClassName } from '@/features/inventory/utils/inventoryListPresentation';
import { getStockHealthPresentation } from '@/features/inventory/utils/stockHealth';
import { cn } from '@/lib/utils';

type InventoryQuantityValueProps = {
  item: InventoryItem;
  className?: string;
};

export function InventoryQuantityValue({ item, className }: InventoryQuantityValueProps) {
  const stockHealth = getStockHealthPresentation(item);
  const isColored = stockHealth.label !== 'Healthy';
  const quantityClassName = getQuantityClassName(item);

  if (!isColored) {
    return (
      <span className={cn('tabular-nums', quantityClassName, className)}>
        {item.quantity_on_hand}
      </span>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn('tabular-nums cursor-default', quantityClassName, className)}
          aria-label={`${stockHealth.label}: ${item.quantity_on_hand}`}
        >
          {item.quantity_on_hand}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{stockHealth.label}</TooltipContent>
    </Tooltip>
  );
}
