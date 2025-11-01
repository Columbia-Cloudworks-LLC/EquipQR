
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

export interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (value: unknown, item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
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

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  isLoading = false,
  pagination,
  sorting,
  emptyMessage = 'No data available',
  className = ''
}: DataTableProps<T>) {
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

  if (isLoading) {
    return (
      <div className={`border rounded-lg ${className}`}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={index} style={{ width: column.width }}>
                  {column.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                {columns.map((_, colIndex) => (
                  <TableCell key={colIndex}>
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
    <div className={`space-y-4 ${className}`}>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead 
                  key={index} 
                  style={{ width: column.width }}
                  className={column.sortable ? 'cursor-pointer hover:bg-muted/50' : ''}
                  onClick={() => column.sortable && handleSort(column.key as string)}
                >
                  <div className="flex items-center gap-2">
                    {column.title}
                    {column.sortable && (
                      <span className="text-xs opacity-50">
                        {getSortIcon(column.key as string) || '↕'}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={index}>
                  {columns.map((column, colIndex) => (
                    <TableCell key={colIndex}>
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
