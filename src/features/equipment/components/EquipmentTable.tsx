import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnSizingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, QrCode } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DotStatus } from '@/components/ui/dot-status';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  EQUIPMENT_TABLE_ACTIONS_COLUMN_KEY,
  EQUIPMENT_TABLE_COLUMN_ORDER,
  getDefaultEquipmentColumnSizing,
  getEquipmentTableColumnMeta,
  type EquipmentTableColumnKey,
  type EquipmentTableSortField,
} from '@/features/equipment/components/equipmentTableColumns';
import type { SortConfig } from '@/features/equipment/hooks/useEquipmentFiltering';
import type { EquipmentPMStatus } from '@/features/equipment/hooks/useEquipmentPMStatus';
import { safeFormatDate } from '@/features/equipment/utils/equipmentHelpers';
import {
  getEquipmentTableCellDisplayValue,
  type EquipmentTableRow,
} from '@/features/equipment/utils/equipmentTableRows';
import { measureColumnAutoFitWidth } from '@/features/inventory/utils/tableColumnAutoFit';
import { useUserSettings } from '@/hooks/useUserSettings';
import { cn } from '@/lib/utils';

const STATUS_COLUMN_KEY: EquipmentTableColumnKey = 'status';
const COLUMN_SIZING_STORAGE_KEY = 'equipqr:equipment-table-column-sizing:v2';

export interface EquipmentTableProps {
  equipment: EquipmentTableRow[];
  onShowQRCode: (id: string) => void;
  pmStatuses?: Map<string, EquipmentPMStatus>;
  sortConfig?: SortConfig;
  onSortChange?: (field: string, direction?: 'asc' | 'desc') => void;
  /**
   * Per-column visibility map keyed by `EquipmentTableColumnMeta.key`.
   * Omitted keys (and an undefined map) default to visible.
   */
  visibleColumns?: Record<string, boolean>;
}

function loadStoredColumnSizing(): ColumnSizingState {
  if (typeof window === 'undefined') {
    return getDefaultEquipmentColumnSizing();
  }

  try {
    const raw = window.localStorage.getItem(COLUMN_SIZING_STORAGE_KEY);
    if (!raw) {
      return getDefaultEquipmentColumnSizing();
    }

    const parsed = JSON.parse(raw) as Record<string, number>;
    return {
      ...getDefaultEquipmentColumnSizing(),
      ...parsed,
    };
  } catch {
    return getDefaultEquipmentColumnSizing();
  }
}

function getAlignClass(align?: 'left' | 'right' | 'center'): string {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return '';
}

function getSortIcon(
  sortBy: string | undefined,
  sortOrder: 'asc' | 'desc' | undefined,
  field: EquipmentTableSortField,
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

/**
 * Resizable, sortable desktop table for the equipment list — mirrors the
 * Alternate Part Groups TanStack table pattern (Issue #633).
 */
const EquipmentTable: React.FC<EquipmentTableProps> = ({
  equipment,
  onShowQRCode,
  sortConfig,
  onSortChange,
  visibleColumns,
}) => {
  const navigate = useNavigate();
  const { settings } = useUserSettings();
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(loadStoredColumnSizing);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(COLUMN_SIZING_STORAGE_KEY, JSON.stringify(columnSizing));
  }, [columnSizing]);

  const isColumnVisible = useCallback(
    (key: EquipmentTableColumnKey): boolean => {
      const meta = getEquipmentTableColumnMeta(key);
      if (meta && !meta.canHide) return true;
      return visibleColumns?.[key] ?? true;
    },
    [visibleColumns],
  );

  const visibleColumnKeys = useMemo(
    () => EQUIPMENT_TABLE_COLUMN_ORDER.filter((key) => isColumnVisible(key)),
    [isColumnVisible],
  );

  const handleSortClick = useCallback(
    (field: EquipmentTableSortField) => {
      if (!onSortChange) return;
      const nextDirection =
        sortConfig?.field === field
          ? sortConfig.direction === 'asc'
            ? 'desc'
            : 'asc'
          : 'asc';
      onSortChange(field, nextDirection);
    },
    [onSortChange, sortConfig],
  );

  const handleAutoFitColumn = useCallback(
    (columnKey: EquipmentTableColumnKey) => {
      const meta = getEquipmentTableColumnMeta(columnKey);
      if (!meta?.resizable) return;

      const samples = equipment.map((row) =>
        getEquipmentTableCellDisplayValue(row, columnKey, settings),
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
    [equipment, settings],
  );

  const columns = useMemo<ColumnDef<EquipmentTableRow>[]>(() => {
    const dataColumns: ColumnDef<EquipmentTableRow>[] = visibleColumnKeys.map((columnKey) => {
      const meta = getEquipmentTableColumnMeta(columnKey);
      if (!meta) {
        throw new Error(`Missing equipment table column meta for ${columnKey}`);
      }

      const column: ColumnDef<EquipmentTableRow> = {
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
              onClick={() => handleSortClick(meta.sortField)}
              aria-label={`Sort by ${meta.title}`}
            >
              {columnKey === STATUS_COLUMN_KEY ? (
                <span className="sr-only">{meta.title}</span>
              ) : (
                <span>{meta.title}</span>
              )}
              {getSortIcon(sortConfig?.field, sortConfig?.direction, meta.sortField)}
            </button>
          ) : (
            <span className="block w-full text-xs font-medium text-muted-foreground">
              {meta.title}
            </span>
          ),
        cell: ({ row }) => {
          const item = row.original;

          switch (columnKey) {
            case 'name':
              return (
                <button
                  type="button"
                  className="block w-full truncate text-left font-medium hover:text-primary"
                  onClick={() => navigate(`/dashboard/equipment/${item.id}`)}
                >
                  {item.name}
                </button>
              );
            case 'status':
              return (
                <div className="flex items-center justify-center">
                  <DotStatus status={item.status} className="mt-0" />
                </div>
              );
            case 'manufacturer':
              return <span className="block truncate">{item.manufacturer || '—'}</span>;
            case 'model':
              return <span className="block truncate">{item.model || '—'}</span>;
            case 'serial_number':
              return (
                <span className="block truncate font-mono text-sm">
                  {item.serial_number || '—'}
                </span>
              );
            case 'working_hours':
              return (
                <span className="block truncate text-right tabular-nums">
                  {item.working_hours != null ? item.working_hours.toLocaleString() : '—'}
                </span>
              );
            case 'location':
              return <span className="block truncate">{item.location || '—'}</span>;
            case 'team_name':
              return item.team_id && item.team_name ? (
                <Link
                  to={`/dashboard/teams/${item.team_id}`}
                  className="block truncate hover:text-primary"
                  onClick={(event) => event.stopPropagation()}
                >
                  {item.team_name}
                </Link>
              ) : (
                <span className="block truncate text-muted-foreground">—</span>
              );
            case 'last_maintenance':
              return (
                <span className="block truncate text-right tabular-nums">
                  {!item.last_maintenance
                    ? '—'
                    : (safeFormatDate(item.last_maintenance, settings) ?? '—')}
                </span>
              );
            default: {
              const exhaustive: never = columnKey;
              return exhaustive;
            }
          }
        },
      };

      return column;
    });

    const actionsColumn: ColumnDef<EquipmentTableRow> = {
      id: EQUIPMENT_TABLE_ACTIONS_COLUMN_KEY,
      size: columnSizing[EQUIPMENT_TABLE_ACTIONS_COLUMN_KEY] ?? 56,
      minSize: 56,
      maxSize: 56,
      enableResizing: false,
      header: () => null,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onShowQRCode(row.original.id)}
            aria-label={`Show QR code for ${row.original.name}`}
          >
            <QrCode className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ),
    };

    return [...dataColumns, actionsColumn];
  }, [
    columnSizing,
    handleSortClick,
    navigate,
    onShowQRCode,
    settings,
    sortConfig?.direction,
    sortConfig?.field,
    visibleColumnKeys,
  ]);

  const table = useReactTable({
    data: equipment,
    columns,
    state: { columnSizing },
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: 'onEnd',
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const tableWidth = Math.max(table.getTotalSize(), 960);

  if (equipment.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No equipment matches your filters.
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
                      const columnId = header.column.id;
                      const isStatusColumn = columnId === STATUS_COLUMN_KEY;
                      const isActionsColumn = columnId === EQUIPMENT_TABLE_ACTIONS_COLUMN_KEY;
                      const meta = isActionsColumn
                        ? undefined
                        : getEquipmentTableColumnMeta(columnId as EquipmentTableColumnKey);

                      return (
                        <TableHead
                          key={header.id}
                          className={cn(
                            getAlignClass(meta?.align),
                            meta?.mono && 'font-mono tabular-nums',
                            isActionsColumn && 'w-14 px-2',
                            'relative select-none',
                            isStatusColumn && 'sticky left-0 z-20 bg-card px-2',
                          )}
                          aria-sort={
                            meta?.sortable && sortConfig?.field === meta.sortField
                              ? sortConfig.direction === 'asc'
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
                                handleAutoFitColumn(columnId as EquipmentTableColumnKey);
                              }}
                              className={cn(
                                'absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none bg-border/45 hover:bg-border/80',
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
                      const columnId = cell.column.id;
                      const isStatusColumn = columnId === STATUS_COLUMN_KEY;
                      const isActionsColumn = columnId === EQUIPMENT_TABLE_ACTIONS_COLUMN_KEY;
                      const meta = isActionsColumn
                        ? undefined
                        : getEquipmentTableColumnMeta(columnId as EquipmentTableColumnKey);

                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            getAlignClass(meta?.align),
                            meta?.mono && 'font-mono tabular-nums',
                            isStatusColumn && 'sticky left-0 z-10 bg-card px-2 align-middle',
                            isActionsColumn && 'w-14 px-2',
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
};

export default EquipmentTable;
