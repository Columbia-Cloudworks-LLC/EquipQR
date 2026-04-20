import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { EquipmentRecord } from '@/features/equipment/types/equipment';

import { BulkApplyConfirmDialog } from './BulkApplyConfirmDialog';
import {
  BulkEditableCell,
  type BulkEditableCellProps,
  type BulkEditableCellSelectOption,
} from './BulkEditableCell';

// TODO(#627): Add `react-window` virtualization when the grid is exercised
// against organizations with 500+ equipment rows. The headless TanStack Table
// already exposes `rows` as a flat array, so virtualization is a drop-in
// replacement of the `<TableBody>` map with a windowed renderer.

const STATUS_OPTIONS: BulkEditableCellSelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inactive', label: 'Inactive' },
];

/**
 * Map from `EquipmentRecord` field key to the human-readable label shown in
 * the Bulk Apply confirmation dialog when AC#4 broadcasts a single-cell edit
 * across selected rows.
 */
const FIELD_LABELS: Partial<Record<keyof EquipmentRecord, string>> = {
  status: 'Status',
  manufacturer: 'Manufacturer',
  model: 'Model',
  serial_number: 'Serial #',
  working_hours: 'Hours',
  location: 'Location',
};

interface PendingApply {
  rowId: string;
  field: keyof EquipmentRecord;
  fieldLabel: string;
  value: string | number | null;
}

export interface BulkEquipmentGridProps {
  rows: EquipmentRecord[];
  dirtyRows: Map<string, Partial<EquipmentRecord>>;
  selectedRowIds: Set<string>;
  onSetCellValue: <K extends keyof EquipmentRecord>(
    id: string,
    field: K,
    value: EquipmentRecord[K]
  ) => void;
  onSetCellValueOnRows: <K extends keyof EquipmentRecord>(
    ids: string[],
    field: K,
    value: EquipmentRecord[K]
  ) => void;
  onToggleSelected: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClearSelection: () => void;
}

/**
 * TanStack Table-driven bulk-edit grid (#627). Renders onto shadcn `<Table>`
 * primitives (intentionally NOT the project's wrapper `DataTable` from #633 —
 * TanStack provides its own state, sort, and selection model). v1 surfaces
 * the same static column set as the dense-table view: Name (read-only / link),
 * Status, Manufacturer, Model, Serial #, Hours, Location, and Team
 * (display-only). Custom attributes are deferred to a follow-up issue.
 *
 * Single-click on a cell toggles row selection; double-click mounts the
 * inline editor inside `BulkEditableCell`. When the edited row is part of a
 * multi-row selection (AC#4), `BulkApplyConfirmDialog` prompts the user
 * before broadcasting the change.
 */
export const BulkEquipmentGrid: React.FC<BulkEquipmentGridProps> = ({
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

  /** Returns the merged value (dirty delta wins over the original row value). */
  const getDisplayValue = useCallback(
    <K extends keyof EquipmentRecord>(
      row: EquipmentRecord,
      field: K
    ): EquipmentRecord[K] => {
      const delta = dirtyRows.get(row.id);
      if (delta && field in delta) {
        return delta[field] as EquipmentRecord[K];
      }
      return row[field];
    },
    [dirtyRows]
  );

  /** Cell-change router: applies directly OR opens the BulkApply dialog. */
  const handleCellChange = useCallback(
    <K extends keyof EquipmentRecord>(
      rowId: string,
      field: K,
      value: EquipmentRecord[K]
    ) => {
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

  const columns = useMemo<ColumnDef<EquipmentRecord>[]>(() => {
    const editableTextCol = (
      key: 'manufacturer' | 'model' | 'serial_number' | 'location',
      title: string,
      extra: Partial<BulkEditableCellProps> = {}
    ): ColumnDef<EquipmentRecord> => ({
      id: key,
      accessorKey: key,
      header: ({ column }) => <SortableHeader column={column} title={title} />,
      cell: ({ row }) => (
        <BulkEditableCell
          rowId={row.original.id}
          field={key}
          type="text"
          value={(getDisplayValue(row.original, key) as string | null) ?? null}
          initialValue={(row.original[key] as string | null) ?? null}
          onChange={(next) => handleCellChange(row.original.id, key, next as EquipmentRecord[typeof key])}
          onSelectRow={onToggleSelected}
          {...extra}
        />
      ),
      enableSorting: true,
    });

    return [
      {
        id: 'select',
        header: () => {
          const allSelected = rows.length > 0 && rows.every((r) => selectedRowIds.has(r.id));
          const someSelected = rows.some((r) => selectedRowIds.has(r.id));
          const checked: boolean | 'indeterminate' = allSelected
            ? true
            : someSelected
              ? 'indeterminate'
              : false;
          return (
            <Checkbox
              checked={checked}
              onCheckedChange={(value) => {
                if (value === true) onSelectAll(rows.map((r) => r.id));
                else onClearSelection();
              }}
              aria-label="Select all rows"
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            checked={selectedRowIds.has(row.original.id)}
            onCheckedChange={() => onToggleSelected(row.original.id)}
            aria-label={`Select ${row.original.name}`}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }) => <SortableHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <Link
            to={`/dashboard/equipment/${row.original.id}`}
            className="inline-flex min-h-8 items-center font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.name}
          </Link>
        ),
        enableSorting: true,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }) => <SortableHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <BulkEditableCell
            rowId={row.original.id}
            field="status"
            type="select"
            selectOptions={STATUS_OPTIONS}
            value={getDisplayValue(row.original, 'status') as string}
            initialValue={row.original.status}
            formatDisplay={(v) =>
              STATUS_OPTIONS.find((o) => o.value === v)?.label ?? String(v ?? '')
            }
            onChange={(next) =>
              handleCellChange(row.original.id, 'status', next as EquipmentRecord['status'])
            }
            onSelectRow={onToggleSelected}
          />
        ),
        enableSorting: true,
      },
      editableTextCol('manufacturer', 'Manufacturer'),
      editableTextCol('model', 'Model'),
      editableTextCol('serial_number', 'Serial #', { mono: true }),
      {
        id: 'working_hours',
        accessorKey: 'working_hours',
        header: ({ column }) => <SortableHeader column={column} title="Hours" align="right" />,
        cell: ({ row }) => (
          <BulkEditableCell
            rowId={row.original.id}
            field="working_hours"
            type="number"
            align="right"
            mono
            value={(getDisplayValue(row.original, 'working_hours') as number | null) ?? null}
            initialValue={row.original.working_hours ?? null}
            formatDisplay={(v) => (typeof v === 'number' ? v.toLocaleString() : '—')}
            onChange={(next) =>
              handleCellChange(row.original.id, 'working_hours', (next as number | null))
            }
            onSelectRow={onToggleSelected}
          />
        ),
        enableSorting: true,
      },
      editableTextCol('location', 'Location'),
      {
        id: 'team_name',
        accessorKey: 'team_name',
        header: ({ column }) => <SortableHeader column={column} title="Team" />,
        cell: ({ row }) =>
          row.original.team_id && row.original.team_name ? (
            <Link
              to={`/dashboard/teams/${row.original.team_id}`}
              className="inline-flex min-h-8 items-center underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {row.original.team_name}
            </Link>
          ) : (
            // TODO(#627): Make Team editable via a `<Select>` driven by the
            // org-teams query. v1 keeps Team display-only because team_id is a
            // foreign key — wiring an inline picker is a follow-up.
            <span className="text-muted-foreground">—</span>
          ),
        enableSorting: true,
      },
    ];
  }, [
    rows,
    selectedRowIds,
    onToggleSelected,
    onSelectAll,
    onClearSelection,
    getDisplayValue,
    handleCellChange,
  ]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

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

  return (
    <>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No equipment to edit.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isSelected = selectedRowIds.has(row.original.id);
                const isRowDirty = dirtyRows.has(row.original.id);
                return (
                  <TableRow
                    key={row.id}
                    data-state={isSelected ? 'selected' : undefined}
                    className={cn(isRowDirty && 'bg-primary/5')}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-1.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

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
      className={cn('h-7 px-1 text-xs font-medium', align === 'right' && 'ml-auto')}
    >
      {title}
      <Icon className="ml-1 h-3 w-3" aria-hidden />
    </Button>
  );
};
