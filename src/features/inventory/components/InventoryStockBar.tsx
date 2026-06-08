import { computeInventoryStockBarState } from '@/features/inventory/utils/inventoryStockBar';
import { cn } from '@/lib/utils';

type InventoryStockBarProps = {
  quantityOnHand: number;
  lowStockThreshold: number;
  className?: string;
};

export function InventoryStockBar({
  quantityOnHand,
  lowStockThreshold,
  className,
}: InventoryStockBarProps) {
  const { fillPercent, notchPercent, ariaLabel } = computeInventoryStockBarState(
    quantityOnHand,
    lowStockThreshold,
  );

  return (
    <div className={cn('relative flex h-3 w-full items-center', className)}>
      <div
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={Math.max(lowStockThreshold, 1)}
        aria-valuenow={quantityOnHand}
        className="relative h-1.5 w-full rounded-full bg-secondary"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${fillPercent}%` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 z-10 h-2.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/75 shadow-sm ring-1 ring-background/80"
          style={{ left: `${notchPercent}%` }}
        />
      </div>
    </div>
  );
}
