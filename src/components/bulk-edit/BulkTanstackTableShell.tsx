import React from 'react';
import { flexRender, type Table as TanstackTable } from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

type BulkTanstackTableShellProps<TRow> = {
  table: TanstackTable<TRow>;
  columnCount: number;
  emptyMessage: string;
  selectedRowIds: Set<string>;
  getRowId: (row: TRow) => string;
  isRowDirty: (row: TRow) => boolean;
  onRowClick: (rowId: string, event: React.MouseEvent<HTMLTableRowElement>) => void;
};

export function BulkTanstackTableShell<TRow>({
  table,
  columnCount,
  emptyMessage,
  selectedRowIds,
  getRowId,
  isRowDirty,
  onRowClick,
}: BulkTanstackTableShellProps<TRow>) {
  return (
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
              <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => {
              const rowId = getRowId(row.original);
              const isSelected = selectedRowIds.has(rowId);
              const rowDirty = isRowDirty(row.original);
              return (
                <TableRow
                  key={row.id}
                  data-state={isSelected ? 'selected' : undefined}
                  className={cn('cursor-pointer', rowDirty && 'bg-primary/5')}
                  onClick={(e) => onRowClick(rowId, e)}
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
  );
}
