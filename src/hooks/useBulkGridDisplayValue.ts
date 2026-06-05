import { useCallback } from 'react';
import { getBulkDisplayValue } from '@/hooks/bulkGridDisplayValue';

export function useBulkGridDisplayValue<T extends { id: string }, K extends keyof T>(
  dirtyRows: Map<string, Partial<T>>,
) {
  return useCallback(
    (row: T, field: K): T[K] => getBulkDisplayValue(row, field, dirtyRows),
    [dirtyRows],
  );
}
