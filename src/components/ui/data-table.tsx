
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DataTableDensity = 'compact' | 'comfortable';

export interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (value: unknown, item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  /** When true, render the cell + header in the monospace font with tabular numerals. */
  mono?: boolean;
  /** Horizontal alignment for the cell + header. */
  align?: 'left' | 'right' | 'center';
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  sorting?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  };
  emptyMessage?: string;
  className?: string;
  /** Cell padding density. Defaults to `'comfortable'` for backward compatibility. */
  density?: DataTableDensity;
  /** When true, the table header sticks to the top of a scrollable body. */
  stickyHeader?: boolean;
  /** When true, the first column is pinned to the left edge while scrolling horizontally. */
  freezeFirstColumn?: boolean;
  /** Max body height applied when `stickyHeader` is true. Defaults to `'60vh'`. */
  maxBodyHeight?: string;
}

const resolveNestedValue = (source: unknown, path: string): unknown => {
  if (!source || typeof source !== 'object') {
    return undefined;
  }

  return path.split('.').reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === 'object') {
      const record = acc as Record<string, unknown>;
      return record[segment];
    }

    return undefined;
  }, source);
};

const getAlignClass = (align?: Column<unknown>['align']): string => {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return '';
};

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  isLoading = false,
  pagination,
  sorting,
  emptyMessage = 'No data available',
  className = '',
  density = 'comfortable',
  stickyHeader = false,
  freezeFirstColumn = false,
  maxBodyHeight = '60vh',
}: DataTableProps<T>) {
  const isCompact = density === 'compact';

  // Density classes are applied via the wrapper so the base shadcn primitives
  // in `src/components/ui/table.tsx` stay untouched.
  const headDensityClass = isCompact ? 'h-9 px-2 text-xs' : '';
  const cellDensityClass = isCompact ? 'py-1.5 px-2 text-sm' : '';

  // Sticky header sits above scrolled rows; the 1-px box-shadow line stands in
  // for the bottom border because borders don't paint reliably on sticky <thead>.
  const stickyHeaderClass = stickyHeader
    ? 'sticky top-0 z-20 bg-background shadow-[0_1px_0_0_hsl(var(--border))]'
    : '';

  const frozenHeadCellClass = freezeFirstColumn
    ? 'sticky left-0 z-30 bg-background'
    : '';

  // Frozen body cell needs the row hover highlight to also paint on the pinned cell.
  const frozenBodyCellClass = freezeFirstColumn
    ? 'sticky left-0 z-10 bg-background group-hover:bg-muted/50'
    : '';

  const rowGroupClass = freezeFirstColumn ? 'group' : '';

  const getAriaSort = (columnKey: string): 'ascending' | 'descending' | 'none' => {
    if (sorting?.sortBy !== columnKey) {
      return 'none';
    }

    return sorting.sortOrder === 'asc' ? 'ascending' : 'descending';
  };

  const handleSort = (columnKey: string) => {
    if (!sorting?.onSortChange) return;

    const newSortOrder =
      sorting.sortBy === columnKey && sorting.sortOrder === 'asc' ? 'desc' : 'asc';
    sorting.onSortChange(columnKey, newSortOrder);
  };

  const getSortIcon = (columnKey: string) => {
    if (sorting?.sortBy !== columnKey) return null;
    return sorting.sortOrder === 'asc' ? '↑' : '↓';
  };

  const renderCell = (column: Column<T>, item: T, index: number) => {
    const value = typeof column.key === 'string' && column.key.includes('.')
      ? resolveNestedValue(item, column.key)
      : item[column.key as keyof T];

    if (column.render) {
      return column.render(value, item, index);
    }

    return value;
  };

  // The outer container for the table body. When stickyHeader is enabled we own
  // the scroller so the header can pin against it; otherwise we use the existing
  // bordered card layout that ships with the underlying <Table />.
  const scrollerClass = stickyHeader
    ? 'relative w-full overflow-auto rounded-sm border'
    : 'border rounded-lg';

  const scrollerStyle = stickyHeader ? { maxHeight: maxBodyHeight } : undefined;

  const tableWithWrapper = !stickyHeader;

  if (isLoading) {
    return (
      <div className={cn(scrollerClass, className)} style={scrollerStyle}>
        <Table withWrapper={tableWithWrapper}>
          <TableHeader className={stickyHeaderClass || undefined}>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead
                  key={index}
                  style={{ width: column.width }}
                  className={cn(
                    headDensityClass,
                    getAlignClass(column.align),
                    column.mono && 'font-mono tabular-nums',
                    index === 0 && frozenHeadCellClass,
                  )}
                >
                  {column.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index} className={rowGroupClass || undefined}>
                {columns.map((column, colIndex) => (
                  <TableCell
                    key={colIndex}
                    className={cn(
                      cellDensityClass,
                      colIndex === 0 && frozenBodyCellClass,
                    )}
                  >
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className={scrollerClass} style={scrollerStyle}>
        <Table withWrapper={tableWithWrapper}>
          <TableHeader className={stickyHeaderClass || undefined}>
            <TableRow>
              {columns.map((column, index) => {
                const alignClass = getAlignClass(column.align);
                const monoClass = column.mono ? 'font-mono tabular-nums' : '';
                const frozenClass = index === 0 ? frozenHeadCellClass : '';
                return (
                  <TableHead
                    key={index}
                    style={{ width: column.width }}
                    className={cn(
                      headDensityClass,
                      alignClass,
                      monoClass,
                      frozenClass,
                      column.sortable && 'hover:bg-muted/50',
                    )}
                    aria-sort={column.sortable ? getAriaSort(column.key as string) : undefined}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        className={cn(
                          'flex w-full items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                          alignClass === 'text-right' && 'justify-end',
                          alignClass === 'text-center' && 'justify-center',
                          !alignClass && 'text-left',
                        )}
                        onClick={() => handleSort(column.key as string)}
                      >
                        {column.title}
                        <span className="text-xs opacity-50">
                          {getSortIcon(column.key as string) || '↕'}
                        </span>
                      </button>
                    ) : (
                      <div
                        className={cn(
                          'flex items-center gap-2',
                          alignClass === 'text-right' && 'justify-end',
                          alignClass === 'text-center' && 'justify-center',
                        )}
                      >
                        {column.title}
                      </div>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className={cn('text-center py-8 text-muted-foreground', cellDensityClass)}
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={index} className={rowGroupClass || undefined}>
                  {columns.map((column, colIndex) => (
                    <TableCell
                      key={colIndex}
                      className={cn(
                        cellDensityClass,
                        getAlignClass(column.align),
                        column.mono && 'font-mono tabular-nums',
                        colIndex === 0 && frozenBodyCellClass,
                      )}
                    >
                      {renderCell(column, item, index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
