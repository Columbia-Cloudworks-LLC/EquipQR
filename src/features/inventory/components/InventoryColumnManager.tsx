import { useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Columns3,
  Plus,
  RotateCcw,
  Settings2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  INVENTORY_TABLE_COLUMN_META,
  type InventoryTableColumnKey,
} from '@/features/inventory/components/inventoryTableColumns';
import { InventoryDensityToggle } from '@/features/inventory/components/InventoryDensityToggle';
import type { InventoryTableDensity } from '@/features/inventory/types/inventory';

type InventoryColumnManagerProps = {
  columnVisibility: Record<string, boolean>;
  columnOrder: InventoryTableColumnKey[];
  density: InventoryTableDensity;
  hasOverrides: boolean;
  onMoveColumn: (key: InventoryTableColumnKey, direction: 'up' | 'down') => void;
  onAddColumn: (key: InventoryTableColumnKey) => void;
  onRemoveColumn: (key: InventoryTableColumnKey) => void;
  onDensityChange: (density: InventoryTableDensity) => void;
  onResetColumns: () => void;
  onResetWidths: () => void;
  onResetAll: () => void;
};

export function InventoryColumnManager({
  columnVisibility,
  columnOrder,
  density,
  hasOverrides,
  onMoveColumn,
  onAddColumn,
  onRemoveColumn,
  onDensityChange,
  onResetColumns,
  onResetWidths,
  onResetAll,
}: InventoryColumnManagerProps) {
  const { shownColumns, availableColumns } = useMemo(() => {
    const shown = columnOrder.filter((key) => columnVisibility[key] !== false);
    const available = INVENTORY_TABLE_COLUMN_META.filter(
      (meta) => meta.canHide && columnVisibility[meta.key] === false,
    );
    return { shownColumns: shown, availableColumns: available };
  }, [columnOrder, columnVisibility]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          aria-label="Manage table columns"
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Columns</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Columns3 className="h-4 w-4" aria-hidden />
            Table columns
          </DialogTitle>
          <DialogDescription>
            Choose which fields appear in the desktop inventory table and set their order.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Density</span>
          <InventoryDensityToggle density={density} onChange={onDensityChange} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Available fields</p>
            <ScrollArea className="h-56 rounded-md border p-2">
              <div className="space-y-1">
                {availableColumns.length === 0 ? (
                  <p className="px-2 py-4 text-sm text-muted-foreground text-center">
                    All optional fields are shown.
                  </p>
                ) : (
                  availableColumns.map((meta) => (
                    <div
                      key={meta.key}
                      className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5"
                    >
                      <span className="flex-1 text-sm">{meta.title}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onAddColumn(meta.key)}
                        aria-label={`Show ${meta.title}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Shown fields</p>
            <ScrollArea className="h-56 rounded-md border p-2">
              <div className="space-y-1">
                {shownColumns.map((key, index) => {
                  const meta = INVENTORY_TABLE_COLUMN_META.find((c) => c.key === key);
                  if (!meta) return null;
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-1 rounded-md border bg-card px-2 py-1.5"
                    >
                      <span className="flex-1 text-sm">{meta.title}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === 0}
                        onClick={() => onMoveColumn(key, 'up')}
                        aria-label={`Move ${meta.title} up`}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === shownColumns.length - 1}
                        onClick={() => onMoveColumn(key, 'down')}
                        aria-label={`Move ${meta.title} down`}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      {meta.canHide ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onRemoveColumn(key)}
                          aria-label={`Hide ${meta.title}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onResetColumns}>
              Reset columns
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onResetWidths}>
              Reset widths
            </Button>
            {hasOverrides && (
              <Button type="button" variant="ghost" size="sm" onClick={onResetAll}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden />
                Reset all
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
