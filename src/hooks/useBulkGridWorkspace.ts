import { useState } from 'react';
import type { SortingState } from '@tanstack/react-table';
import { useBulkGridClickToSelect } from '@/hooks/useBulkGridClickToSelect';
import { useBulkGridPendingApply } from '@/hooks/useBulkGridPendingApply';

type BulkGridWorkspaceOptions<TField extends string> = {
  selectedRowIds: Set<string>;
  fieldLabels: Record<TField, string>;
  onSetCellValue: (rowId: string, field: TField, value: unknown) => void;
  onSetCellValueOnRows?: (rowIds: string[], field: TField, value: unknown) => void;
  onToggleSelected: (rowId: string) => void;
  defaultSort?: SortingState;
};

export function useBulkGridWorkspace<TField extends string>({
  selectedRowIds,
  fieldLabels,
  onSetCellValue,
  onSetCellValueOnRows,
  onToggleSelected,
  defaultSort = [{ id: 'name', desc: false }],
}: BulkGridWorkspaceOptions<TField>) {
  const [sorting, setSorting] = useState<SortingState>(defaultSort);
  const { cancelPendingSelection, handleRowClick } = useBulkGridClickToSelect(onToggleSelected);

  const pendingApply = useBulkGridPendingApply<TField>({
    selectedRowIds,
    fieldLabels,
    onSetCellValue,
    onSetCellValueOnRows,
  });

  return {
    sorting,
    setSorting,
    cancelPendingSelection,
    handleRowClick,
    ...pendingApply,
  };
}
