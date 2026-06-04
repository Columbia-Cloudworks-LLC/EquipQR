import { useCallback, useState } from 'react';

export interface BulkGridPendingApply<TField extends string> {
  rowId: string;
  field: TField;
  fieldLabel: string;
  value: string | number | null;
}

export interface UseBulkGridPendingApplyOptions<TField extends string> {
  selectedRowIds: Set<string>;
  fieldLabels: Partial<Record<TField, string>>;
  onSetCellValue: (rowId: string, field: TField, value: unknown) => void;
  onSetCellValueOnRows: (ids: string[], field: TField, value: unknown) => void;
}

export function useBulkGridPendingApply<TField extends string>({
  selectedRowIds,
  fieldLabels,
  onSetCellValue,
  onSetCellValueOnRows,
}: UseBulkGridPendingApplyOptions<TField>) {
  const [pendingApply, setPendingApply] = useState<BulkGridPendingApply<TField> | null>(null);

  const handleCellChange = useCallback(
    (rowId: string, field: TField, value: unknown) => {
      if (selectedRowIds.has(rowId) && selectedRowIds.size > 1) {
        setPendingApply({
          rowId,
          field,
          fieldLabel: fieldLabels[field] ?? String(field),
          value: value as string | number | null,
        });
        return;
      }
      onSetCellValue(rowId, field, value);
    },
    [selectedRowIds, fieldLabels, onSetCellValue]
  );

  const handleApplyAll = useCallback(() => {
    if (!pendingApply) return;
    const ids = Array.from(selectedRowIds);
    onSetCellValueOnRows(ids, pendingApply.field, pendingApply.value);
    setPendingApply(null);
  }, [pendingApply, selectedRowIds, onSetCellValueOnRows]);

  const handleApplyOne = useCallback(() => {
    if (!pendingApply) return;
    onSetCellValue(pendingApply.rowId, pendingApply.field, pendingApply.value);
    setPendingApply(null);
  }, [pendingApply, onSetCellValue]);

  const clearPendingApply = useCallback(() => setPendingApply(null), []);

  return {
    pendingApply,
    handleCellChange,
    handleApplyAll,
    handleApplyOne,
    clearPendingApply,
  };
}
