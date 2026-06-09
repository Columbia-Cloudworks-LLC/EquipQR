import { AlignJustify, Rows3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { InventoryTableDensity } from '@/features/inventory/types/inventory';
import { cn } from '@/lib/utils';

type InventoryDensityToggleProps = {
  density: InventoryTableDensity;
  onChange: (density: InventoryTableDensity) => void;
  className?: string;
};

export function InventoryDensityToggle({
  density,
  onChange,
  className,
}: InventoryDensityToggleProps) {
  return (
    <div className={cn('inline-flex items-center rounded-md border', className)}>
      <Button
        type="button"
        variant={density === 'compact' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-8 rounded-r-none px-2"
        onClick={() => onChange('compact')}
        aria-label="Compact table density"
        aria-pressed={density === 'compact'}
      >
        <Rows3 className="h-3.5 w-3.5" aria-hidden />
      </Button>
      <Button
        type="button"
        variant={density === 'comfortable' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-8 rounded-l-none px-2"
        onClick={() => onChange('comfortable')}
        aria-label="Comfortable table density"
        aria-pressed={density === 'comfortable'}
      >
        <AlignJustify className="h-3.5 w-3.5" aria-hidden />
      </Button>
    </div>
  );
}
