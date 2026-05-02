import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { InventoryItem } from '@/features/inventory/types/inventory';

import { BulkApplyConfirmDialog } from '@/features/equipment/components/BulkApplyConfirmDialog';
import {
  BulkEditableCell,
  type BulkEditableCellProps,
} from '@/features/equipment/components/BulkEditableCell';
import type {
  BulkEditableField,
  InventoryRowDelta,
} from '@/features/inventory/hooks/useBulkEditInventory';

// ============================================
// Column layout constants
// ============================================

const COL = {
  select: 48,
  name: 220,
  sku: 120,
  external_id: 130,
  location: 150,
  quantity_on_hand: 110,
  low_stock_threshold: 110,
  default_unit_cost: 120,
} as const;

const TOTAL_COL_WIDTH = Object.values(COL).reduce((a, b) => a + b, 0);
const ROW_HEIGHT = 44;
const MAX_VISIBLE_ROWS = 14;

const FIELD_LABELS: Partial<Record<BulkEditableField, string>> = {
  name: 'Name',
  sku: 'SKU',
  external_id: 'External ID',
  location: 'Location',
  quantity_on_hand: 'Qty on Hand',
  low_stock_threshold: 'Low Stock',
  default_unit_cost: 'Unit Cost',
};

// ============================================
// Props
// ============================================

interface PendingApply {
  rowId: string;
  field: BulkEditableField;
  fieldLabel: string;
  value: string | number | null;
}

export interface InventoryBulkGridProps {
  rows: InventoryItem[];
  dirtyRows: Map<string, InventoryRowDelta>;
  selectedRowIds: Set<string>;
  onSetCellValue: <K extends BulkEditableField>(
    id: string,
    field: K,
    value: InventoryItem[K]
  ) => void;
  onSetCellValueOnRows: <K extends BulkEditableField>(
    ids: string[],
    field: K,
    value: InventoryItem[K]
  ) => void;
  onToggleSelected: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClearSelection: () => void;
}

// ============================================
// Sortable header helper
// ============================================

interface SortableHeaderProps {
  column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: (desc?: boolean) => void };
  title: string;
  align?: 'left' | 'right';
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ column, title, align = 'left' }) => {
  const sorted = column.getIsSorted();
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className={cn('h-7 px-1 text-xs font-medium w-full', align === 'right' ? 'justify-end' : 'justify-start')}
    >
      {title}
      <Icon className="ml-1 h-3 w-3 shrink-0" aria-hidden />
    </Button>
  );
};

// ============================================
// Main component
// ============================================

export const InventoryBulkGrid: React.FC<InventoryBulkGridProps> = ({
  rows,
  dirtyRows,
  selectedRowIds,
  onSetCellValue,
  onSetCellValueOnRows,
  onToggleSelected,
  onSelectAll,
  onClearSelection,
}) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [pendingApply, setPendingApply] = useState<PendingApply | null>(null);

  // Debounce timer for click-to-select (mirrors equipment grid behaviour)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSelectIdRef = useRef<string | null>(null);

  const cancelPendingSelection = useCallback(() => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    pendingSelectIdRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
    };
  }, []);

  // Container width measurement for react-window
  const containerRef = useRef<HTMLDivElement>(null);
  const [listWidth, setListWidth] = useState(TOTAL_COL_WIDTH);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? TOTAL_COL_WIDTH;
      setListWidth(Math.max(w, TOTAL_COL_WIDTH));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── TanStack Table (sort only; selection is managed externally) ────────────

  const columns = useMemo<ColumnDef<InventoryItem>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }) => <SortableHeader column={column} title="Name" />,
        enableSorting: true,
      },
      {
        id: 'sku',
        accessorKey: 'sku',
        header: ({ column }) => <SortableHeader column={column} title="SKU" />,
        enableSorting: true,
      },
      {
        id: 'external_id',
        accessorKey: 'external_id',
        header: ({ column }) => <SortableHeader column={column} title="External ID" />,
        enableSorting: true,
      },
      {
        id: 'location',
        accessorKey: 'location',
        header: ({ column }) => <SortableHeader column={column} title="Location" />,
        enableSorting: true,
      },
      {
        id: 'quantity_on_hand',
        accessorKey: 'quantity_on_hand',
        header: ({ column }) => <SortableHeader column={column} title="Qty on Hand" align="right" />,
        enableSorting: true,
      },
      {
        id: 'low_stock_threshold',
        accessorKey: 'low_stock_threshold',
        header: ({ column }) => <SortableHeader column={column} title="Low Stock" align="right" />,
        enableSorting: true,
      },
      {
        id: 'default_unit_cost',
        accessorKey: 'default_unit_cost',
        header: ({ column }) => <SortableHeader column={column} title="Unit Cost ($)" align="right" />,
        enableSorting: true,
      },
    ],
    []
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

  const sortedRows = table.getRowModel().rows.map((r) => r.original);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getDisplayValue = useCallback(
    <K extends BulkEditableField>(row: InventoryItem, field: K): InventoryItem[K] => {
      const delta = dirtyRows.get(row.id);
      if (delta && field in delta) {
        return delta[field] as InventoryItem[K];
      }
      return row[field];
    },
    [dirtyRows]
  );

  const handleCellChange = useCallback(
    <K extends BulkEditableField>(rowId: string, field: K, value: InventoryItem[K]) => {
      if (selectedRowIds.has(rowId) && selectedRowIds.size > 1) {
        setPendingApply({
          rowId,
          field,
          fieldLabel: FIELD_LABELS[field] ?? String(field),
          value: value as string | number | null,
        });
        return;
      }
      onSetCellValue(rowId, field, value);
    },
    [selectedRowIds, onSetCellValue]
  );

  const handleRowClick = useCallback(
    (rowId: string, e: React.MouseEvent<HTMLDivElement>) => {
      if (e.detail > 1) return;
      cancelPendingSelection();
      pendingSelectIdRef.current = rowId;
      clickTimerRef.current = setTimeout(() => {
        const id = pendingSelectIdRef.current;
        clickTimerRef.current = null;
        pendingSelectIdRef.current = null;
        if (id) onToggleSelected(id);
      }, 250);
    },
    [cancelPendingSelection, onToggleSelected]
  );

  const handleApplyAll = () => {
    if (!pendingApply) return;
    const ids = Array.from(selectedRowIds);
    onSetCellValueOnRows(ids, pendingApply.field, pendingApply.value as never);
    setPendingApply(null);
  };

  const handleApplyOne = () => {
    if (!pendingApply) return;
    onSetCellValue(pendingApply.rowId, pendingApply.field, pendingApply.value as never);
    setPendingApply(null);
  };

  // ── Editable cell builder ──────────────────────────────────────────────────

  const editableTextCell = useCallback(
    (
      row: InventoryItem,
      field: 'name' | 'sku' | 'external_id' | 'location',
      extra: Partial<BulkEditableCellProps> = {}
    ) => (
      <BulkEditableCell
        rowId={row.id}
        field={field}
        type="text"
        value={(getDisplayValue(row, field) as string | null) ?? null}
        initialValue={(row[field] as string | null) ?? null}
        onChange={(next) =>
          handleCellChange(row.id, field, next as InventoryItem[typeof field])
        }
        onSelectRow={onToggleSelected}
        onCancelPendingSelect={cancelPendingSelection}
        {...extra}
      />
    ),
    [getDisplayValue, handleCellChange, onToggleSelected, cancelPendingSelection]
  );

  const editableNumericCell = useCallback(
    (
      row: InventoryItem,
      field: 'quantity_on_hand' | 'low_stock_threshold' | 'default_unit_cost'
    ) => (
      <BulkEditableCell
        rowId={row.id}
        field={field}
        type="number"
        align="right"
        mono
        value={(getDisplayValue(row, field) as number | null) ?? null}
        initialValue={(row[field] as number | null) ?? null}
        formatDisplay={(v) =>
          typeof v === 'number' ? v.toLocaleString() : '—'
        }
        onChange={(next) =>
          handleCellChange(row.id, field, (next as number | null) as InventoryItem[typeof field])
        }
        onSelectRow={onToggleSelected}
        onCancelPendingSelect={cancelPendingSelection}
      />
    ),
    [getDisplayValue, handleCellChange, onToggleSelected, cancelPendingSelection]
  );

  // ── All-selected state for header checkbox ─────────────────────────────────

  const allSelected = sortedRows.length > 0 && sortedRows.every((r) => selectedRowIds.has(r.id));
  const someSelected = sortedRows.some((r) => selectedRowIds.has(r.id));
  const headerCheckboxState: boolean | 'indeterminate' = allSelected
    ? true
    : someSelected
    ? 'indeterminate'
    : false;

  // ── react-window row renderer ──────────────────────────────────────────────

  const RowRenderer = useCallback(
    ({ index, style }: ListChildComponentProps) => {
      const row = sortedRows[index];
      if (!row) return null;
      const isSelected = selectedRowIds.has(row.id);
      const isRowDirty = dirtyRows.has(row.id);

      return (
        <div
          style={{ ...style, display: 'flex', width: TOTAL_COL_WIDTH }}
          role="row"
          aria-selected={isSelected}
          className={cn(
            'border-b transition-colors',
            isSelected && 'bg-muted/30',
            isRowDirty && !isSelected && 'bg-primary/5',
            'cursor-pointer hover:bg-muted/20'
          )}
          onClick={(e) => handleRowClick(row.id, e)}
        >
          {/* Checkbox cell */}
          <div
            style={{ width: COL.select, flexShrink: 0 }}
            className="flex items-center justify-center px-2"
            role="gridcell"
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelected(row.id)}
              aria-label={`Select ${row.name}`}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Name */}
          <div
            style={{ width: COL.name, flexShrink: 0 }}
            className="flex items-center px-1"
            role="gridcell"
          >
            {editableTextCell(row, 'name')}
          </div>

          {/* SKU */}
          <div
            style={{ width: COL.sku, flexShrink: 0 }}
            className="flex items-center px-1"
            role="gridcell"
          >
            {editableTextCell(row, 'sku', { mono: true })}
          </div>

          {/* External ID */}
          <div
            style={{ width: COL.external_id, flexShrink: 0 }}
            className="flex items-center px-1"
            role="gridcell"
          >
            {editableTextCell(row, 'external_id', { mono: true })}
          </div>

          {/* Location */}
          <div
            style={{ width: COL.location, flexShrink: 0 }}
            className="flex items-center px-1"
            role="gridcell"
          >
            {editableTextCell(row, 'location')}
          </div>

          {/* Qty on Hand */}
          <div
            style={{ width: COL.quantity_on_hand, flexShrink: 0 }}
            className="flex items-center px-1"
            role="gridcell"
          >
            {editableNumericCell(row, 'quantity_on_hand')}
          </div>

          {/* Low Stock */}
          <div
            style={{ width: COL.low_stock_threshold, flexShrink: 0 }}
            className="flex items-center px-1"
            role="gridcell"
          >
            {editableNumericCell(row, 'low_stock_threshold')}
          </div>

          {/* Unit Cost */}
          <div
            style={{ width: COL.default_unit_cost, flexShrink: 0 }}
            className="flex items-center px-1"
            role="gridcell"
          >
            {editableNumericCell(row, 'default_unit_cost')}
          </div>
        </div>
      );
    },
    [
      sortedRows,
      selectedRowIds,
      dirtyRows,
      editableTextCell,
      editableNumericCell,
      handleRowClick,
      onToggleSelected,
    ]
  );

  // ── Grid height ────────────────────────────────────────────────────────────

  const bodyHeight =
    sortedRows.length === 0 ? ROW_HEIGHT : Math.min(sortedRows.length * ROW_HEIGHT, MAX_VISIBLE_ROWS * ROW_HEIGHT);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        ref={containerRef}
        className="rounded-md border bg-card overflow-x-auto"
        role="grid"
        aria-label="Inventory bulk edit"
        aria-rowcount={sortedRows.length}
      >
        {/* ── Sticky header ── */}
        <div
          style={{ width: TOTAL_COL_WIDTH, minWidth: TOTAL_COL_WIDTH }}
          className="flex border-b bg-muted/30 sticky top-0 z-10"
          role="rowgroup"
        >
          {/* Checkbox header */}
          <div
            style={{ width: COL.select, flexShrink: 0 }}
            className={cn(
              'flex items-center justify-center h-[38px] px-2',
              'text-xs font-medium text-muted-foreground'
            )}
            role="columnheader"
          >
            <Checkbox
              checked={headerCheckboxState}
              onCheckedChange={(value) => {
                if (value === true) onSelectAll(sortedRows.map((r) => r.id));
                else onClearSelection();
              }}
              aria-label="Select all rows"
            />
          </div>

          {/* Column headers from TanStack table */}
          {table.getHeaderGroups().map((group) =>
            group.headers
              .filter((h) => h.column.id !== '__select')
              .map((header) => {
                const key = header.column.id as keyof typeof COL;
                const width = COL[key] ?? 120;
                return (
                  <div
                    key={header.id}
                    style={{ width, flexShrink: 0 }}
                    className="flex items-center h-[38px] px-0"
                    role="columnheader"
                    aria-sort={
                      header.column.getIsSorted() === 'asc'
                        ? 'ascending'
                        : header.column.getIsSorted() === 'desc'
                        ? 'descending'
                        : 'none'
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </div>
                );
              })
          )}
        </div>

        {/* ── Virtualized body ── */}
        {sortedRows.length === 0 ? (
          <div
            style={{ height: ROW_HEIGHT, width: TOTAL_COL_WIDTH }}
            className="flex items-center justify-center text-sm text-muted-foreground"
            role="row"
          >
            No inventory items to edit.
          </div>
        ) : (
          <div role="rowgroup">
            <FixedSizeList
              height={bodyHeight}
              itemCount={sortedRows.length}
              itemSize={ROW_HEIGHT}
              width={listWidth}
              style={{ overflowX: 'hidden' }}
            >
              {RowRenderer}
            </FixedSizeList>
          </div>
        )}
      </div>

      {/* Bulk-apply confirmation dialog */}
      <BulkApplyConfirmDialog
        open={pendingApply !== null}
        fieldLabel={pendingApply?.fieldLabel ?? ''}
        selectedCount={selectedRowIds.size}
        onApplyAll={handleApplyAll}
        onApplyOne={handleApplyOne}
        onCancel={() => setPendingApply(null)}
      />
    </>
  );
};
