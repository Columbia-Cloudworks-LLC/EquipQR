import { useCallback } from 'react';
import { toast } from 'sonner';

import type { BulkEditRowStateResult } from '@/hooks/useBulkEditRowState';

/** Narrow mutation surface shared by bulk-edit domain hooks. */
export type BulkEditCommitMutation = {
  isPending: boolean;
  mutateAsync: () => Promise<unknown>;
};

export type BulkEditCommitRowState<
  TRow extends { id: string },
  TDelta extends Record<string, unknown>,
> = Pick<
  BulkEditRowStateResult<TRow, TDelta>,
  | 'dirtyRows'
  | 'selectedRowIds'
  | 'dirtyCount'
  | 'selectedCount'
  | 'setCellValue'
  | 'setCellValueOnRows'
  | 'clearDirty'
  | 'toggleSelected'
  | 'selectAll'
  | 'clearSelection'
>;

export type BulkEditCommitHookResult<
  TRow extends { id: string },
  TDelta extends Record<string, unknown>,
> = BulkEditCommitRowState<TRow, TDelta> & {
  isPending: boolean;
  commit: () => Promise<void>;
};

/** Shared TanStack mutation `onError` handler for bulk-edit commits. */
export const bulkEditMutationOnError = (error: unknown): void => {
  toast.error(error instanceof Error ? error.message : 'Bulk update failed');
};

/**
 * Builds the public bulk-edit hook return shape: row state + commit guard + pending flag.
 * Domain hooks keep validation, service calls, and cache invalidation in `useMutation`.
 */
export const useBulkEditCommitResult = <
  TRow extends { id: string },
  TDelta extends Record<string, unknown>,
>(
  rowState: BulkEditCommitRowState<TRow, TDelta>,
  commitMutation: BulkEditCommitMutation
): BulkEditCommitHookResult<TRow, TDelta> => {
  const commit = useCallback(async () => {
    if (rowState.dirtyRows.size === 0) return;
    await commitMutation.mutateAsync();
  }, [commitMutation, rowState.dirtyRows.size]);

  return {
    dirtyRows: rowState.dirtyRows,
    selectedRowIds: rowState.selectedRowIds,
    dirtyCount: rowState.dirtyCount,
    selectedCount: rowState.selectedCount,
    isPending: commitMutation.isPending,
    setCellValue: rowState.setCellValue,
    setCellValueOnRows: rowState.setCellValueOnRows,
    clearDirty: rowState.clearDirty,
    toggleSelected: rowState.toggleSelected,
    selectAll: rowState.selectAll,
    clearSelection: rowState.clearSelection,
    commit,
  };
};
