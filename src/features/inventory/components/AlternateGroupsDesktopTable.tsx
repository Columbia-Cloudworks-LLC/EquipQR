import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnSizingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AlternateGroupStatusDot } from '@/features/inventory/components/AlternateGroupStatusDot';
import {
  ALTERNATE_GROUP_TABLE_COLUMN_ORDER,
  getAlternateGroupTableColumnMeta,
  getDefaultAlternateGroupColumnSizing,
  type AlternateGroupTableColumnKey,
  type AlternateGroupTableSortField,
} from '@/features/inventory/components/alternateGroupTableColumns';
import type { AlternateGroupTableRow } from '@/features/inventory/types/inventory';
import {
  getAlternateGroupTableCellDisplayValue,
  isAlternateGroupMemberLowStock,
} from '@/features/inventory/utils/alternateGroupTableRows';
import { measureColumnAutoFitWidth } from '@/features/inventory/utils/tableColumnAutoFit';
import { cn } from '@/lib/utils';

const VERIFIED_COLUMN_KEY: AlternateGroupTableColumnKey = 'verified';
const COLUMN_SIZING_STORAGE_KEY = 'equipqr:alternate-groups-table-column-sizing';

type AlternateGroupsDesktopTableProps = {
  rows: AlternateGroupTableRow[];
  sortBy: AlternateGroupTableSortField;
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: AlternateGroupTableSortField) => void;
};

function loadStoredColumnSizing(): ColumnSizingState {
  if (typeof window === 'undefined') {
    return getDefaultAlternateGroupColumnSizing();
  }

  try {
    const raw = window.localStorage.getItem(COLUMN_SIZING_STORAGE_KEY);
    if (!raw) {
      return getDefaultAlternateGroupColumnSizing();
    }

    const parsed = JSON.parse(raw) as Record<string, number>;
    return {
      ...getDefaultAlternateGroupColumnSizing(),
      ...parsed,
    };
  } catch {
    return getDefaultAlternateGroupColumnSizing();
  }
}

function getAlignClass(align?: 'left' | 'right' | 'center'): string {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return '';
}

function formatUnitCost(value: number | null): string {
  if (value == null) return '—';
  return `$${Number(value).toFixed(2)}`;
}

function formatLowStock(
  quantityOnHand: number | null,
  lowStockThreshold: number | null,
): string {
  const isLowStock = isAlternateGroupMemberLowStock(quantityOnHand, lowStockThreshold);
  if (isLowStock == null) return '—';
  return isLowStock ? 'Yes' : 'No';
}

function getSortIcon(
  sortBy: AlternateGroupTableSortField,
  sortOrder: 'asc' | 'desc',
  field: AlternateGroupTableSortField,
) {
  if (sortBy !== field) {
    return <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" aria-hidden />;
  }

  return sortOrder === 'asc' ? (
    <ArrowUp className="h-3 w-3 shrink-0" aria-hidden />
  ) : (
    <ArrowDown className="h-3 w-3 shrink-0" aria-hidden />
  );
}

export function AlternateGroupsDesktopTable({
  rows,
  sortBy,
  sortOrder,
  onSortChange,
}: AlternateGroupsDesktopTableProps) {
  const navigate = useNavigate();
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(loadStoredColumnSizing);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(COLUMN_SIZING_STORAGE_KEY, JSON.stringify(columnSizing));
  }, [columnSizing]);

  const handleAutoFitColumn = useCallback(
    (columnKey: AlternateGroupTableColumnKey) => {
      const meta = getAlternateGroupTableColumnMeta(columnKey);
      if (!meta?.resizable) return;

      const samples = rows.map((row) =>
        getAlternateGroupTableCellDisplayValue(row, meta.sortField),
      );
      samples.unshift(meta.title);

      const nextWidth = measureColumnAutoFitWidth(samples, {
        minWidth: meta.minWidth,
        maxWidth: meta.maxWidth,
        mono: meta.mono,
      });

      setColumnSizing((current) => ({
        ...current,
        [columnKey]: nextWidth,
      }));
    },
    [rows],
  );

  const columns = useMemo<ColumnDef<AlternateGroupTableRow>[]>(() => {
    return ALTERNATE_GROUP_TABLE_COLUMN_ORDER.map((columnKey) => {
      const meta = getAlternateGroupTableColumnMeta(columnKey);
      if (!meta) {
        throw new Error(`Missing alternate group table column meta for ${columnKey}`);
      }

      const column: ColumnDef<AlternateGroupTableRow> = {
        id: columnKey,
        size: columnSizing[columnKey] ?? meta.defaultWidth,
        minSize: meta.minWidth,
        maxSize: meta.maxWidth,
        enableResizing: meta.resizable,
        header: () =>
          meta.sortable ? (
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-1 rounded-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                meta.align === 'right' && 'justify-end',
                meta.align === 'center' && 'justify-center',
                !meta.align || meta.align === 'left' ? 'justify-start' : undefined,
              )}
              onClick={() => onSortChange(meta.sortField)}
              aria-label={`Sort by ${meta.title}`}
            >
              {columnKey === VERIFIED_COLUMN_KEY ? (
                <span className="sr-only">{meta.title}</span>
              ) : (
                <span>{meta.title}</span>
              )}
              {getSortIcon(sortBy, sortOrder, meta.sortField)}
            </button>
          ) : (
            <span className="block w-full text-xs font-medium text-muted-foreground">
              {meta.title}
            </span>
          ),
        cell: ({ row }) => {
          const item = row.original;

          switch (columnKey) {
            case 'verified':
              return (
                <div className="flex items-center justify-center">
                  <AlternateGroupStatusDot status={item.group_status} className="mt-0" />
                </div>
              );
            case 'group_name':
              return (
                <button
                  type="button"
                  className="block w-full truncate text-left font-medium hover:text-primary"
                  onClick={() => navigate(`/dashboard/alternate-groups/${item.group_id}`)}
                >
                  {item.group_name}
                </button>
              );
            case 'identifier_manufacturer':
              return (
                <span className="block truncate">{item.identifier_manufacturer ?? '—'}</span>
              );
            case 'item_name':
              return item.inventory_item_id ? (
                <button
                  type="button"
                  className={cn(
                    'block w-full truncate text-left hover:text-primary',
                    item.is_primary && 'underline decoration-primary underline-offset-2',
                  )}
                  onClick={() => navigate(`/dashboard/inventory/${item.inventory_item_id}`)}
                >
                  {item.item_name ?? 'Unknown item'}
                </button>
              ) : (
                <span className="block truncate text-muted-foreground">—</span>
              );
            case 'identifier_value':
              return (
                <span
                  className={cn(
                    'block truncate font-mono text-sm',
                    item.is_primary &&
                      !item.inventory_item_id &&
                      item.identifier_value &&
                      'underline decoration-primary underline-offset-2',
                  )}
                >
                  {item.identifier_value ?? '—'}
                </span>
              );
            case 'item_sku':
              return (
                <span className="block truncate font-mono text-sm">{item.item_sku ?? '—'}</span>
              );
            case 'default_unit_cost':
              return (
                <span className="block truncate text-right tabular-nums">
                  {formatUnitCost(item.default_unit_cost)}
                </span>
              );
            case 'quantity_on_hand':
              return (
                <span className="block truncate text-right tabular-nums">
                  {item.quantity_on_hand ?? '—'}
                </span>
              );
            case 'low_stock':
              return (
                <span
                  className={cn(
                    'block truncate',
                    isAlternateGroupMemberLowStock(
                      item.quantity_on_hand,
                      item.low_stock_threshold,
                    ) && 'font-medium text-warning',
                  )}
                >
                  {formatLowStock(item.quantity_on_hand, item.low_stock_threshold)}
                </span>
              );
            case 'location':
              return <span className="block truncate">{item.location ?? '—'}</span>;
            default: {
              const exhaustive: never = columnKey;
              return exhaustive;
            }
          }
        },
      };

      return column;
    });
  }, [columnSizing, navigate, onSortChange, sortBy, sortOrder]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { columnSizing },
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: 'onEnd',
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const tableWidth = Math.max(table.getTotalSize(), 960);

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No parts match the current filters.
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table
              withWrapper={false}
              className="table-fixed"
              style={{ width: tableWidth, minWidth: '100%' }}
            >
              <colgroup>
                {table.getHeaderGroups()[0]?.headers.map((header) => (
                  <col key={header.id} style={{ width: header.getSize() }} />
                ))}
              </colgroup>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const meta = getAlternateGroupTableColumnMeta(
                        header.column.id as AlternateGroupTableColumnKey,
                      );
                      const isVerifiedColumn = header.column.id === VERIFIED_COLUMN_KEY;

                      return (
                        <TableHead
                          key={header.id}
                          className={cn(
                            getAlignClass(meta?.align),
                            meta?.mono && 'font-mono tabular-nums',
                            isVerifiedColumn && 'sticky left-0 z-20 bg-card px-2',
                            'relative select-none',
                          )}
                          aria-sort={
                            meta?.sortable && sortBy === meta.sortField
                              ? sortOrder === 'asc'
                                ? 'ascending'
                                : 'descending'
                              : 'none'
                          }
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanResize() && (
                            <div
                              role="separator"
                              aria-orientation="vertical"
                              aria-label={`Resize ${meta?.title ?? 'column'}`}
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              onDoubleClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleAutoFitColumn(header.column.id as AlternateGroupTableColumnKey);
                              }}
                              className={cn(
                                'absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none hover:bg-border/80',
                                header.column.getIsResizing() && 'bg-primary',
                              )}
                            />
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => {
                      const meta = getAlternateGroupTableColumnMeta(
                        cell.column.id as AlternateGroupTableColumnKey,
                      );
                      const isVerifiedColumn = cell.column.id === VERIFIED_COLUMN_KEY;

                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            getAlignClass(meta?.align),
                            meta?.mono && 'font-mono tabular-nums',
                            isVerifiedColumn && 'sticky left-0 z-10 bg-card px-2 align-middle',
                            'overflow-hidden',
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
