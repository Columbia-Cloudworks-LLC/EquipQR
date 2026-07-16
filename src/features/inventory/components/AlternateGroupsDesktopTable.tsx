import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  DataTableEmptyState,
  ResizableFixedDataTable,
  applyAutoFitColumnWidth,
  createResizableSortableColumnBase,
  getDataTableAlignClass,
  getResizableTableWidth,
  usePersistedColumnSizing,
} from '@/components/common/dataTableShared';
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
import { cn } from '@/lib/utils';

const VERIFIED_COLUMN_KEY: AlternateGroupTableColumnKey = 'verified';
const COLUMN_SIZING_STORAGE_KEY = 'equipqr:alternate-groups-table-column-sizing';

type AlternateGroupsDesktopTableProps = {
  rows: AlternateGroupTableRow[];
  sortBy: AlternateGroupTableSortField;
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: AlternateGroupTableSortField) => void;
};

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

export function AlternateGroupsDesktopTable({
  rows,
  sortBy,
  sortOrder,
  onSortChange,
}: AlternateGroupsDesktopTableProps) {
  const navigate = useNavigate();
  const [columnSizing, setColumnSizing] = usePersistedColumnSizing(
    COLUMN_SIZING_STORAGE_KEY,
    getDefaultAlternateGroupColumnSizing(),
  );

  const handleAutoFitColumn = useCallback(
    (columnKey: AlternateGroupTableColumnKey) => {
      const meta = getAlternateGroupTableColumnMeta(columnKey);
      if (!meta) return;

      applyAutoFitColumnWidth(
        setColumnSizing,
        columnKey,
        rows.map((row) => getAlternateGroupTableCellDisplayValue(row, meta.sortField)),
        meta,
      );
    },
    [rows, setColumnSizing],
  );

  const columns = useMemo<ColumnDef<AlternateGroupTableRow>[]>(() => {
    return ALTERNATE_GROUP_TABLE_COLUMN_ORDER.map((columnKey) => {
      const meta = getAlternateGroupTableColumnMeta(columnKey);
      if (!meta) {
        throw new Error(`Missing alternate group table column meta for ${columnKey}`);
      }

      const column: ColumnDef<AlternateGroupTableRow> = {
        ...createResizableSortableColumnBase(columnKey, columnSizing, meta, {
          active: sortBy === meta.sortField,
          sortOrder: sortBy === meta.sortField ? sortOrder : undefined,
          onSort: () => onSortChange(meta.sortField),
          hideVisibleTitle: columnKey === VERIFIED_COLUMN_KEY,
        }),
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

  const tableWidth = getResizableTableWidth(table.getTotalSize());

  if (rows.length === 0) {
    return <DataTableEmptyState message="No parts match the current filters." />;
  }

  return (
    <ResizableFixedDataTable
      table={table}
      tableWidth={tableWidth}
      withTooltipProvider
      getHeaderProps={(header) => {
        const meta = getAlternateGroupTableColumnMeta(
          header.column.id as AlternateGroupTableColumnKey,
        );
        const isVerifiedColumn = header.column.id === VERIFIED_COLUMN_KEY;

        return {
          className: cn(
            getDataTableAlignClass(meta?.align),
            meta?.mono && 'font-mono tabular-nums',
            isVerifiedColumn && 'sticky left-0 z-20 bg-card px-2',
            'relative select-none',
          ),
          ariaSort:
            meta?.sortable && sortBy === meta.sortField
              ? sortOrder === 'asc'
                ? 'ascending'
                : 'descending'
              : 'none',
          onAutoFit: () =>
            handleAutoFitColumn(header.column.id as AlternateGroupTableColumnKey),
        };
      }}
      getCellClassName={(cell) => {
        const meta = getAlternateGroupTableColumnMeta(
          cell.column.id as AlternateGroupTableColumnKey,
        );
        const isVerifiedColumn = cell.column.id === VERIFIED_COLUMN_KEY;

        return cn(
          getDataTableAlignClass(meta?.align),
          meta?.mono && 'font-mono tabular-nums',
          isVerifiedColumn && 'sticky left-0 z-10 bg-card px-2 align-middle',
          'overflow-hidden',
        );
      }}
    />
  );
}
