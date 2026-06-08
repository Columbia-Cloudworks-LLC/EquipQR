import type { InventoryListMetadata } from '@/features/inventory/types/inventory';
import { cn } from '@/lib/utils';

type InventoryHealthSummaryProps = {
  metadata: InventoryListMetadata;
  className?: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function InventoryHealthSummary({
  metadata,
  className,
}: InventoryHealthSummaryProps) {
  const stats = [
    { label: 'Total', value: metadata.totalCount, tone: 'text-foreground' },
    { label: 'Low stock', value: metadata.lowStockCount, tone: 'text-warning' },
    { label: 'Out of stock', value: metadata.outOfStockCount, tone: 'text-destructive' },
    { label: 'Negative', value: metadata.negativeStockCount, tone: 'text-destructive' },
    {
      label: 'Missing data',
      value:
        metadata.missingLocationCount +
        metadata.missingUnitCostCount +
        metadata.missingSkuCount,
      tone: 'text-muted-foreground',
    },
    {
      label: 'Est. value',
      value: formatCurrency(metadata.estimatedInventoryValue),
      tone: 'text-foreground',
      isText: true,
    },
  ];

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6',
        className,
      )}
      aria-label="Inventory health summary"
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-md border bg-card px-3 py-2"
        >
          <p className="text-xs text-muted-foreground">{stat.label}</p>
          <p className={cn('text-sm font-semibold tabular-nums', stat.tone)}>
            {stat.isText ? stat.value : stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
