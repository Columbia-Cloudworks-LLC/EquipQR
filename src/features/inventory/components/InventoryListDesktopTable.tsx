import { useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnSizingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { Layers, MoreVertical } from 'lucide-react';
import { BulkGridSortableHeader } from '@/components/bulk-edit/BulkGridSortableHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  INVENTORY_TABLE_COLUMN_META,
  type InventoryTableColumnKey,
} from '@/features/inventory/components/inventoryTableColumns';
import { InventoryItemActionsMenu } from '@/features/inventory/components/InventoryItemActionsMenu';
import type { InventoryFilters, InventoryItem, InventorySortField, InventoryTableDensity } from '@/features/inventory/types/inventory';
import { getStockHealthPresentation } from '@/features/inventory/utils/stockHealth';
import { getQuantityClassName } from '@/features/inventory/utils/inventoryListPresentation';
import type { InventoryTableRowViewModel } from '@/features/inventory/utils/inventoryListViewModel';
import { useFormatTimestamp } from '@/hooks/useFormatTimestamp';
import { cn } from '@/lib/utils';

const SELECT_COLUMN_ID = '__select';
const ACTIONS_COLUMN_ID = '__actions';

type InventoryListDesktopTableProps = {
  rows: InventoryTableRowViewModel[];
  filters: InventoryFilters;
  columnVisibility: Record<string, boolean>;
  columnOrder: InventoryTableColumnKey[];
  columnSizing: Record<string, number>;
  density: InventoryTableDensity;
  selectedItemIds: Set<string>;
  canCreate: boolean;
  adjustPending: boolean;
  onColumnVisibilityChange: (visibility: VisibilityState) => void;
  onColumnOrderChange: (order: InventoryTableColumnKey[]) => void;
  onColumnSizingChange: (sizing: ColumnSizingState) => void;
  onSortChange: (sortBy: InventorySortField) => void;
  onViewItem: (itemId: string) => void;
  onQuickAdjust: (itemId: string, delta: 1 | -1) => void;
  onShowQR: (item: InventoryItem) => void;
  onEditItem: (item: InventoryItem) => void;
  onManageAlternateGroups: (itemId: string) => void;
  onToggleSelected: (itemId: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
};

function getAlignClass(align?: 'left' | 'right' | 'center'): string {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return '';
}

export function InventoryListDesktopTable({
  rows,
  filters,
  columnVisibility,
  columnOrder,
  columnSizing,
  density,
  selectedItemIds,
  canCreate,
  adjustPending,
  onColumnVisibilityChange,
  onColumnOrderChange,
  onColumnSizingChange,
  onSortChange,
  onViewItem,
  onQuickAdjust,
  onShowQR,
  onEditItem,
  onManageAlternateGroups,
  onToggleSelected,
  onToggleSelectAll,
}: InventoryListDesktopTableProps) {
  const { formatDate, formatDateTime } = useFormatTimestamp();
  const isCompact = density === 'compact';
  const headDensityClass = isCompact ? 'h-9 px-2 text-xs' : '';
  const cellDensityClass = isCompact ? 'py-1.5 px-2 text-sm' : '';

  const allSelected = rows.length > 0 && rows.every((row) => selectedItemIds.has(row.item.id));
  const someSelected = rows.some((row) => selectedItemIds.has(row.item.id));

  const dataColumns = useMemo<ColumnDef<InventoryTableRowViewModel>[]>(() => {
    const defs: ColumnDef<InventoryTableRowViewModel>[] = [
      {
        id: SELECT_COLUMN_ID,
        size: 48,
        minSize: 48,
        maxSize: 48,
        enableResizing: false,
        header: () => (
          <Checkbox
            checked={allSelected ? true : someSelected ? 'indeterminate' : false}
            onCheckedChange={(checked) => onToggleSelectAll(checked === true)}
            aria-label="Select all inventory items"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedItemIds.has(row.original.item.id)}
            onCheckedChange={() => onToggleSelected(row.original.item.id)}
            aria-label={`Select ${row.original.item.name}`}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
    ];

    for (const key of columnOrder) {
      if (columnVisibility[key] === false) continue;
      const meta = INVENTORY_TABLE_COLUMN_META.find((c) => c.key === key);
      if (!meta) continue;

      const sortField = key as InventorySortField;
      const col: ColumnDef<InventoryTableRowViewModel> = {
        id: key,
        accessorKey: key,
        size: columnSizing[key] ?? meta.defaultWidth,
        minSize: meta.minWidth,
        maxSize: meta.maxWidth,
        enableResizing: true,
        header: ({ column }) =>
          meta.sortable ? (
            <BulkGridSortableHeader
              column={{
                getIsSorted: () => {
                  if (filters.sortBy !== sortField) return false;
                  return filters.sortOrder === 'desc' ? 'desc' : 'asc';
                },
                toggleSorting: () => onSortChange(sortField),
              }}
              title={meta.title}
              align={meta.align === 'right' ? 'right' : 'left'}
              fullWidth
            />
          ) : (
            <span className="text-xs font-medium">{meta.title}</span>
          ),
        cell: ({ row }) => {
          const vm = row.original;
          const item = vm.item;
          const stockHealth = getStockHealthPresentation(item);
          const stockStatusLabel =
            stockHealth.label === 'Healthy' ? 'In Stock' : stockHealth.label;

          switch (key) {
            case 'name':
              return (
                <div className="min-w-0">
                  <button
                    type="button"
                    className="block w-full truncate text-left font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
                    onClick={() => onViewItem(item.id)}
                  >
                    {item.name}
                  </button>
                  {vm.alternateGroupCount > 0 && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Layers className="h-3 w-3" aria-hidden />
                      {vm.alternateGroupCount} alternate group
                      {vm.alternateGroupCount > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              );
            case 'sku':
              return <span className="text-muted-foreground">{item.sku || '—'}</span>;
            case 'external_id':
              return (
                <span className="font-mono text-sm text-muted-foreground">
                  {item.external_id || '—'}
                </span>
              );
            case 'quantity_on_hand':
              return (
                <div className="space-y-1">
                  <div className="flex items-center justify-end gap-2">
                    <span className={cn('tabular-nums', getQuantityClassName(item))}>
                      {item.quantity_on_hand}
                    </span>
                    {stockHealth.label !== 'Healthy' && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          stockHealth.className,
                        )}
                      >
                        {stockHealth.label}
                      </Badge>
                    )}
                  </div>
                  <Progress value={vm.stockBarPercent} className="h-1.5" />
                </div>
              );
            case 'low_stock_threshold':
              return (
                <span className="tabular-nums text-muted-foreground">
                  {item.low_stock_threshold}
                </span>
              );
            case 'location':
              return <span className="text-muted-foreground">{item.location || '—'}</span>;
            case 'default_unit_cost':
              return (
                <span className="tabular-nums text-muted-foreground">
                  {item.default_unit_cost != null ? `$${Number(item.default_unit_cost).toFixed(2)}` : '—'}
                </span>
              );
            case 'status':
              return (
                <Badge
                  variant="outline"
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    stockHealth.className,
                  )}
                >
                  {stockStatusLabel}
                </Badge>
              );
            case 'alternate_groups':
              return (
                <span className="tabular-nums text-muted-foreground">
                  {vm.alternateGroupCount > 0 ? vm.alternateGroupCount : '—'}
                </span>
              );
            case 'description':
              return (
                <span className="line-clamp-2 text-muted-foreground">
                  {item.description || '—'}
                </span>
              );
            case 'created_at':
              return (
                <span className="font-mono text-xs text-muted-foreground">
                  {item.created_at ? formatDate(item.created_at) : '—'}
                </span>
              );
            case 'updated_at':
              return (
                <span className="font-mono text-xs text-muted-foreground">
                  {item.updated_at ? formatDate(item.updated_at) : '—'}
                </span>
              );
            case 'last_adjusted_at':
              return (
                <span className="font-mono text-xs text-muted-foreground">
                  {vm.lastAdjustedAt ? formatDateTime(vm.lastAdjustedAt) : '—'}
                </span>
              );
            default:
              return null;
          }
        },
      };
      defs.push(col);
    }

    defs.push({
      id: ACTIONS_COLUMN_ID,
      size: 56,
      minSize: 56,
      maxSize: 56,
      enableResizing: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const item = row.original.item;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`Actions for ${item.name}`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <InventoryItemActionsMenu
                item={item}
                canCreate={canCreate}
                adjustPending={adjustPending}
                onViewDetails={onViewItem}
                onQuickAdjust={onQuickAdjust}
                onShowQR={onShowQR}
                onEdit={onEditItem}
                onManageAlternateGroups={onManageAlternateGroups}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    });

    return defs;
  }, [
    adjustPending,
    allSelected,
    canCreate,
    columnOrder,
    columnSizing,
    columnVisibility,
    filters.sortBy,
    filters.sortOrder,
    formatDate,
    formatDateTime,
    onEditItem,
    onManageAlternateGroups,
    onQuickAdjust,
    onShowQR,
    onSortChange,
    onToggleSelectAll,
    onToggleSelected,
    onViewItem,
    selectedItemIds,
    someSelected,
  ]);

  const table = useReactTable({
    data: rows,
    columns: dataColumns,
    state: {
      columnVisibility,
      columnOrder: [SELECT_COLUMN_ID, ...columnOrder, ACTIONS_COLUMN_ID],
      columnSizing,
    },
    onColumnVisibilityChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(columnVisibility) : updater;
      onColumnVisibilityChange(next);
    },
    onColumnOrderChange: (updater) => {
      const current = [SELECT_COLUMN_ID, ...columnOrder, ACTIONS_COLUMN_ID];
      const next = typeof updater === 'function' ? updater(current) : updater;
      const filtered = next.filter(
        (id): id is InventoryTableColumnKey =>
          id !== SELECT_COLUMN_ID &&
          id !== ACTIONS_COLUMN_ID &&
          INVENTORY_TABLE_COLUMN_META.some((m) => m.key === id),
      );
      onColumnOrderChange(filtered);
    },
    onColumnSizingChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(columnSizing) : updater;
      onColumnSizingChange(next);
    },
    columnResizeMode: 'onEnd',
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card>
      <CardContent className="p-0">
        <div
          className="relative w-full overflow-auto rounded-sm border"
          style={{ maxHeight: 'calc(100vh - 16rem)' }}
        >
          <Table style={{ width: table.getTotalSize() }}>
            <TableHeader className="sticky top-0 z-20 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => {
                    const meta = INVENTORY_TABLE_COLUMN_META.find(
                      (c) => c.key === header.column.id,
                    );
                    const isFrozen = index <= 1;
                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className={cn(
                          headDensityClass,
                          getAlignClass(meta?.align),
                          meta?.mono && 'font-mono tabular-nums',
                          isFrozen && 'sticky left-0 z-30 bg-background',
                          index === 1 && isFrozen && 'left-[48px]',
                          'relative',
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={cn(
                              'absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none',
                              header.column.getIsResizing() && 'bg-primary',
                            )}
                            aria-hidden
                          />
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={dataColumns.length}
                    className={cn('py-8 text-center text-muted-foreground', cellDensityClass)}
                  >
                    No inventory items match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={selectedItemIds.has(row.original.item.id) ? 'selected' : undefined}
                    className="group hover:bg-muted/50"
                  >
                    {row.getVisibleCells().map((cell, index) => {
                      const meta = INVENTORY_TABLE_COLUMN_META.find(
                        (c) => c.key === cell.column.id,
                      );
                      const isFrozen = index <= 1;
                      return (
                        <TableCell
                          key={cell.id}
                          style={{ width: cell.column.getSize() }}
                          className={cn(
                            cellDensityClass,
                            getAlignClass(meta?.align),
                            meta?.mono && 'font-mono tabular-nums',
                            isFrozen && 'sticky left-0 z-10 bg-background group-hover:bg-muted/50',
                            index === 1 && isFrozen && 'left-[48px]',
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
