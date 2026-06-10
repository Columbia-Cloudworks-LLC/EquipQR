import type { SortingState } from '@tanstack/react-table';
import { useBulkGridWorkspace } from '@/hooks/useBulkGridWorkspace';

type BulkGridEditorHandlers<TField extends string, TValue> = {
  selectedRowIds: Set<string>;
  fieldLabels: Partial<Record<TField, string>>;
  onSetCellValue: (rowId: string, field: TField, value: TValue) => void;
  onSetCellValueOnRows?: (rowIds: string[], field: TField, value: TValue) => void;
  onToggleSelected: (rowId: string) => void;
  defaultSort?: SortingState;
};

/** Typed wrapper around `useBulkGridWorkspace` for bulk-edit grids. */
export function useBulkGridEditorState<TField extends string, TValue>({
  selectedRowIds,
  fieldLabels,
  onSetCellValue,
  onSetCellValueOnRows,
  onToggleSelected,
  defaultSort,
}: BulkGridEditorHandlers<TField, TValue>) {
  return useBulkGridWorkspace<TField>({
    selectedRowIds,
    fieldLabels: fieldLabels as Record<TField, string>,
    onSetCellValue: (rowId, field, value) => onSetCellValue(rowId, field, value as TValue),
    onSetCellValueOnRows: onSetCellValueOnRows
      ? (rowIds, field, value) => onSetCellValueOnRows(rowIds, field, value as TValue)
      : undefined,
    onToggleSelected,
    defaultSort,
  });
}
