import React, { useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { QrCode } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DataTableEmptyState,
  ResizableFixedDataTable,
  applyAutoFitColumnWidth,
  createResizableSortableColumnBase,
  getDataTableAlignClass,
  getResizableTableWidth,
  usePersistedColumnSizing,
} from '@/components/common/dataTableShared';
import { DotStatus } from '@/components/ui/dot-status';
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
  const [columnSizing, setColumnSizing] = usePersistedColumnSizing(
    COLUMN_SIZING_STORAGE_KEY,
    getDefaultEquipmentColumnSizing(),
  );

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
      if (!meta) return;

      applyAutoFitColumnWidth(
        setColumnSizing,
        columnKey,
        equipment.map((row) => getEquipmentTableCellDisplayValue(row, columnKey, settings)),
        meta,
      );
    },
    [equipment, settings, setColumnSizing],
  );

  const columns = useMemo<ColumnDef<EquipmentTableRow>[]>(() => {
    const dataColumns: ColumnDef<EquipmentTableRow>[] = visibleColumnKeys.map((columnKey) => {
      const meta = getEquipmentTableColumnMeta(columnKey);
      if (!meta) {
        throw new Error(`Missing equipment table column meta for ${columnKey}`);
      }

      const column: ColumnDef<EquipmentTableRow> = {
        ...createResizableSortableColumnBase(columnKey, columnSizing, meta, {
          active: sortConfig?.field === meta.sortField,
          sortOrder: sortConfig?.field === meta.sortField ? sortConfig.direction : undefined,
          onSort: () => handleSortClick(meta.sortField),
          hideVisibleTitle: columnKey === STATUS_COLUMN_KEY,
        }),
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

  const tableWidth = getResizableTableWidth(table.getTotalSize());

  if (equipment.length === 0) {
    return <DataTableEmptyState message="No equipment matches your filters." />;
  }

  return (
    <ResizableFixedDataTable
      table={table}
      tableWidth={tableWidth}
      withTooltipProvider
      getHeaderProps={(header) => {
        const columnId = header.column.id;
        const isStatusColumn = columnId === STATUS_COLUMN_KEY;
        const isActionsColumn = columnId === EQUIPMENT_TABLE_ACTIONS_COLUMN_KEY;
        const meta = isActionsColumn
          ? undefined
          : getEquipmentTableColumnMeta(columnId as EquipmentTableColumnKey);

        return {
          className: cn(
            getDataTableAlignClass(meta?.align),
            meta?.mono && 'font-mono tabular-nums',
            isActionsColumn && 'w-14 px-2',
            'relative select-none',
            isStatusColumn && 'sticky left-0 z-20 bg-card px-2',
          ),
          ariaSort:
            meta?.sortable && sortConfig?.field === meta.sortField
              ? sortConfig.direction === 'asc'
                ? 'ascending'
                : 'descending'
              : 'none',
          onAutoFit: isActionsColumn
            ? undefined
            : () => handleAutoFitColumn(columnId as EquipmentTableColumnKey),
        };
      }}
      getCellClassName={(cell) => {
        const columnId = cell.column.id;
        const isStatusColumn = columnId === STATUS_COLUMN_KEY;
        const isActionsColumn = columnId === EQUIPMENT_TABLE_ACTIONS_COLUMN_KEY;
        const meta = isActionsColumn
          ? undefined
          : getEquipmentTableColumnMeta(columnId as EquipmentTableColumnKey);

        return cn(
          getDataTableAlignClass(meta?.align),
          meta?.mono && 'font-mono tabular-nums',
          isStatusColumn && 'sticky left-0 z-10 bg-card px-2 align-middle',
          isActionsColumn && 'w-14 px-2',
          'overflow-hidden',
        );
      }}
    />
  );
};

export default EquipmentTable;
