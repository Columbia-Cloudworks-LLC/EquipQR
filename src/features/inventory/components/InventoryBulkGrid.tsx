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
} from '@tanstack/react-table';
import { List, type RowComponentProps } from 'react-window';
import { BulkGridSortableHeader } from '@/components/bulk-edit/BulkGridSortableHeader';
import { useBulkGridEditorState } from '@/hooks/useBulkGridEditorState';
import { useBulkGridDisplayValue } from '@/hooks/useBulkGridDisplayValue';
import { BulkPendingApplyDialog } from '@/components/bulk-edit/BulkPendingApplyDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { InventoryItem } from '@/features/inventory/types/inventory';

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

type InventoryBulkListRowProps = {
  sortedRows: InventoryItem[];
  selectedRowIds: Set<string>;
  dirtyRows: Map<string, InventoryRowDelta>;
  editableTextCell: (
    row: InventoryItem,
    field: 'name' | 'sku' | 'external_id' | 'location',
    extra?: Partial<BulkEditableCellProps>
  ) => React.ReactElement;
  editableNumericCell: (
    row: InventoryItem,
    field: 'quantity_on_hand' | 'low_stock_threshold' | 'default_unit_cost'
  ) => React.ReactElement;
  handleRowClick: (rowId: string, e: React.MouseEvent<HTMLDivElement>) => void;
  onToggleSelected: (id: string) => void;
};

function InventoryBulkListRow({
  index,
  style,
  ariaAttributes,
  sortedRows,
  selectedRowIds,
  dirtyRows,
  editableTextCell,
  editableNumericCell,
  handleRowClick,
  onToggleSelected,
}: RowComponentProps<InventoryBulkListRowProps>) {
  const row = sortedRows[index];
  if (!row) return null;
  const isSelected = selectedRowIds.has(row.id);
  const isRowDirty = dirtyRows.has(row.id);

  return (
    <div
      {...ariaAttributes}
      role="row"
      style={{ ...style, display: 'flex', width: TOTAL_COL_WIDTH }}
      aria-selected={isSelected}
      className={cn(
        'border-b transition-colors',
        isSelected && 'bg-muted/30',
        isRowDirty && !isSelected && 'bg-primary/5',
        'cursor-pointer hover:bg-muted/20'
      )}
      onClick={(e) => handleRowClick(row.id, e)}
    >
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
      <div
        style={{ width: COL.name, flexShrink: 0 }}
        className="flex items-center px-1"
        role="gridcell"
      >
        {editableTextCell(row, 'name')}
      </div>
      <div
        style={{ width: COL.sku, flexShrink: 0 }}
        className="flex items-center px-1"
        role="gridcell"
      >
        {editableTextCell(row, 'sku', { mono: true })}
      </div>
      <div
        style={{ width: COL.external_id, flexShrink: 0 }}
        className="flex items-center px-1"
        role="gridcell"
      >
        {editableTextCell(row, 'external_id', { mono: true })}
      </div>
      <div
        style={{ width: COL.location, flexShrink: 0 }}
        className="flex items-center px-1"
        role="gridcell"
      >
        {editableTextCell(row, 'location')}
      </div>
      <div
        style={{ width: COL.quantity_on_hand, flexShrink: 0 }}
        className="flex items-center px-1"
        role="gridcell"
      >
        {editableNumericCell(row, 'quantity_on_hand')}
      </div>
      <div
        style={{ width: COL.low_stock_threshold, flexShrink: 0 }}
        className="flex items-center px-1"
        role="gridcell"
      >
        {editableNumericCell(row, 'low_stock_threshold')}
      </div>
      <div
        style={{ width: COL.default_unit_cost, flexShrink: 0 }}
        className="flex items-center px-1"
        role="gridcell"
      >
        {editableNumericCell(row, 'default_unit_cost')}
      </div>
    </div>
  );
}

// ============================================
// Props
// ============================================

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
  const {
    sorting,
    setSorting,
    cancelPendingSelection,
    handleRowClick,
    pendingApply,
    handleCellChange,
    handleApplyAll,
    handleApplyOne,
    clearPendingApply,
  } = useBulkGridEditorState<BulkEditableField, InventoryItem[BulkEditableField]>({
    selectedRowIds,
    fieldLabels: FIELD_LABELS,
    onSetCellValue,
    onSetCellValueOnRows,
    onToggleSelected,
  });

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
        header: ({ column }) => <BulkGridSortableHeader column={column} title="Name" fullWidth />,
        enableSorting: true,
      },
      {
        id: 'sku',
        accessorKey: 'sku',
        header: ({ column }) => <BulkGridSortableHeader column={column} title="SKU" fullWidth />,
        enableSorting: true,
      },
      {
        id: 'external_id',
        accessorKey: 'external_id',
        header: ({ column }) => <BulkGridSortableHeader column={column} title="External ID" fullWidth />,
        enableSorting: true,
      },
      {
        id: 'location',
        accessorKey: 'location',
        header: ({ column }) => <BulkGridSortableHeader column={column} title="Location" fullWidth />,
        enableSorting: true,
      },
      {
        id: 'quantity_on_hand',
        accessorKey: 'quantity_on_hand',
        header: ({ column }) => <BulkGridSortableHeader column={column} title="Qty on Hand" align="right" fullWidth />,
        enableSorting: true,
      },
      {
        id: 'low_stock_threshold',
        accessorKey: 'low_stock_threshold',
        header: ({ column }) => <BulkGridSortableHeader column={column} title="Low Stock" align="right" fullWidth />,
        enableSorting: true,
      },
      {
        id: 'default_unit_cost',
        accessorKey: 'default_unit_cost',
        header: ({ column }) => <BulkGridSortableHeader column={column} title="Unit Cost ($)" align="right" fullWidth />,
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

  const getDisplayValue = useBulkGridDisplayValue<InventoryItem, BulkEditableField>(dirtyRows);

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

  const bulkListRowProps: InventoryBulkListRowProps = useMemo(
    () => ({
      sortedRows,
      selectedRowIds,
      dirtyRows,
      editableTextCell,
      editableNumericCell,
      handleRowClick,
      onToggleSelected,
    }),
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
            <List
              rowComponent={InventoryBulkListRow}
              rowCount={sortedRows.length}
              rowHeight={ROW_HEIGHT}
              rowProps={bulkListRowProps}
              style={{ height: bodyHeight, width: listWidth, overflowX: 'hidden' }}
            />
          </div>
        )}
      </div>

      {/* Bulk-apply confirmation dialog */}
      <BulkPendingApplyDialog
        pendingApply={pendingApply}
        selectedCount={selectedRowIds.size}
        onApplyAll={handleApplyAll}
        onApplyOne={handleApplyOne}
        onCancel={clearPendingApply}
      />
    </>
  );
};
