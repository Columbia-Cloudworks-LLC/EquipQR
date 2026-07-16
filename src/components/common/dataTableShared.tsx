import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { flexRender, type Cell, type ColumnSizingState, type Header, type Table as TanStackTable } from '@tanstack/react-table';
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
import { measureColumnAutoFitWidth } from '@/features/inventory/utils/tableColumnAutoFit';
import { cn } from '@/lib/utils';

export type ResizableColumnMeta = {
  title: string;
  align?: 'left' | 'right' | 'center';
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  resizable: boolean;
  sortable: boolean;
  sortField: string;
  mono?: boolean;
};

export function getResizableColumnSizing<TKey extends string>(
  columnKey: TKey,
  columnSizing: ColumnSizingState,
  meta: ResizableColumnMeta,
) {
  return {
    id: columnKey,
    size: columnSizing[columnKey] ?? meta.defaultWidth,
    minSize: meta.minWidth,
    maxSize: meta.maxWidth,
    enableResizing: meta.resizable,
  };
}

export function applyAutoFitColumnWidth<TKey extends string>(
  setColumnSizing: React.Dispatch<React.SetStateAction<ColumnSizingState>>,
  columnKey: TKey,
  samples: string[],
  meta: Pick<ResizableColumnMeta, 'title' | 'minWidth' | 'maxWidth' | 'mono' | 'resizable'>,
) {
  if (!meta.resizable) return;

  const fitSamples = [...samples];
  fitSamples.unshift(meta.title);

  const nextWidth = measureColumnAutoFitWidth(fitSamples, {
    minWidth: meta.minWidth,
    maxWidth: meta.maxWidth,
    mono: meta.mono,
  });

  setColumnSizing((current) => ({
    ...current,
    [columnKey]: nextWidth,
  }));
}

export function DataTableSortableHeaderButton({
  title,
  align,
  active,
  sortOrder,
  onClick,
  hideVisibleTitle = false,
}: {
  title: string;
  align?: 'left' | 'right' | 'center';
  active: boolean;
  sortOrder?: 'asc' | 'desc';
  onClick: () => void;
  hideVisibleTitle?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-1 rounded-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        align === 'right' && 'justify-end',
        align === 'center' && 'justify-center',
        !align || align === 'left' ? 'justify-start' : undefined,
      )}
      onClick={onClick}
      aria-label={`Sort by ${title}`}
    >
      {hideVisibleTitle ? <span className="sr-only">{title}</span> : <span>{title}</span>}
      <DataTableSortIcon active={active} sortOrder={sortOrder} />
    </button>
  );
}

export function DataTableStaticHeaderLabel({ title }: { title: string }) {
  return <span className="block w-full text-xs font-medium text-muted-foreground">{title}</span>;
}

export function createResizableSortableColumnBase<TKey extends string>(
  columnKey: TKey,
  columnSizing: ColumnSizingState,
  meta: ResizableColumnMeta,
  sortState: {
    active: boolean;
    sortOrder?: 'asc' | 'desc';
    onSort: () => void;
    hideVisibleTitle?: boolean;
  },
) {
  return {
    ...getResizableColumnSizing(columnKey, columnSizing, meta),
    header: () =>
      meta.sortable ? (
        <DataTableSortableHeaderButton
          title={meta.title}
          align={meta.align}
          active={sortState.active}
          sortOrder={sortState.sortOrder}
          onClick={sortState.onSort}
          hideVisibleTitle={sortState.hideVisibleTitle}
        />
      ) : (
        <DataTableStaticHeaderLabel title={meta.title} />
      ),
  };
}

type ResizableTableSurfaceProps<TData> = {
  table: TanStackTable<TData>;
  tableWidth: number;
  scrollClassName?: string;
  getHeaderProps: (header: Header<TData, unknown>) => {
    className: string;
    ariaSort?: 'ascending' | 'descending' | 'none';
    onAutoFit?: () => void;
  };
  getCellClassName: (cell: Cell<TData, unknown>) => string;
  getRowClassName?: (rowIndex: number) => string | undefined;
  emptyMessage?: string;
  emptyColSpan?: number;
  emptyCellClassName?: string;
};

export function ResizableTableSurface<TData>({
  table,
  tableWidth,
  scrollClassName = 'overflow-x-auto',
  getHeaderProps,
  getCellClassName,
  getRowClassName,
  emptyMessage,
  emptyColSpan,
  emptyCellClassName,
}: ResizableTableSurfaceProps<TData>) {
  const rows = table.getRowModel().rows;

  return (
    <div className={scrollClassName}>
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
                const { className, ariaSort, onAutoFit } = getHeaderProps(header);

                return (
                  <TableHead
                    key={header.id}
                    className={className}
                    aria-sort={ariaSort ?? 'none'}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    <DataTableColumnResizeHandle header={header} onAutoFit={onAutoFit} />
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {emptyMessage && rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={emptyColSpan ?? table.getAllColumns().length}
                className={emptyCellClassName}
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, rowIndex) => (
              <TableRow key={row.id} className={getRowClassName?.(rowIndex)}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={getCellClassName(cell)}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

type ResizableFixedDataTableProps<TData> = {
  table: TanStackTable<TData>;
  tableWidth: number;
  withTooltipProvider?: boolean;
  scrollClassName?: string;
  cardClassName?: string;
  getHeaderProps: (header: Header<TData, unknown>) => {
    className: string;
    ariaSort?: 'ascending' | 'descending' | 'none';
    onAutoFit?: () => void;
  };
  getCellClassName: (cell: Cell<TData, unknown>) => string;
};

export function ResizableFixedDataTable<TData>({
  table,
  tableWidth,
  withTooltipProvider = false,
  scrollClassName = 'overflow-x-auto',
  cardClassName = 'overflow-hidden',
  getHeaderProps,
  getCellClassName,
}: ResizableFixedDataTableProps<TData>) {
  const content = (
    <Card className={cardClassName}>
      <CardContent className="p-0">
        <ResizableTableSurface
          table={table}
          tableWidth={tableWidth}
          scrollClassName={scrollClassName}
          getHeaderProps={getHeaderProps}
          getCellClassName={getCellClassName}
        />
      </CardContent>
    </Card>
  );

  if (withTooltipProvider) {
    return <TooltipProvider>{content}</TooltipProvider>;
  }

  return content;
}

export function getDataTableAlignClass(align?: 'left' | 'right' | 'center'): string {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return '';
}

export function DataTableSortIcon({
  active,
  sortOrder,
}: {
  active: boolean;
  sortOrder?: 'asc' | 'desc';
}) {
  if (!active) {
    return <ArrowUpDown className="h-3 w-3 shrink-0 opacity-50" aria-hidden />;
  }

  return sortOrder === 'asc' ? (
    <ArrowUp className="h-3 w-3 shrink-0" aria-hidden />
  ) : (
    <ArrowDown className="h-3 w-3 shrink-0" aria-hidden />
  );
}

export function loadPersistedColumnSizing(
  storageKey: string,
  defaults: ColumnSizingState,
): ColumnSizingState {
  if (typeof window === 'undefined') {
    return defaults;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw) as Record<string, number>;
    return {
      ...defaults,
      ...parsed,
    };
  } catch {
    return defaults;
  }
}

export function usePersistedColumnSizing(storageKey: string, defaults: ColumnSizingState) {
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() =>
    loadPersistedColumnSizing(storageKey, defaults),
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, JSON.stringify(columnSizing));
  }, [columnSizing, storageKey]);

  return [columnSizing, setColumnSizing] as const;
}

export function getResizableTableWidth(totalSize: number, minWidth = 960): number {
  return Math.max(totalSize, minWidth);
}

type DataTableColumnResizeHandleProps<THeader> = {
  header: Header<THeader, unknown>;
  onAutoFit?: () => void;
  className?: string;
};

export function DataTableColumnResizeHandle<THeader>({
  header,
  onAutoFit,
  className,
}: DataTableColumnResizeHandleProps<THeader>) {
  if (!header.column.getCanResize()) {
    return null;
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${header.column.id} column`}
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      onDoubleClick={
        onAutoFit
          ? (event) => {
              event.preventDefault();
              event.stopPropagation();
              onAutoFit();
            }
          : undefined
      }
      className={cn(
        'absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none',
        onAutoFit ? 'bg-border/45 hover:bg-border/80' : 'w-1 hover:bg-border/80',
        header.column.getIsResizing() && 'bg-primary',
        className,
      )}
    />
  );
}

export function DataTableEmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">{message}</CardContent>
    </Card>
  );
}
