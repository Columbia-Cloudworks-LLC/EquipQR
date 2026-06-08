import { useCallback, useMemo, useState } from 'react';

/** Match BulkEditableCell.isDirty: '' and null are equivalent for diff purposes. */
const normalizeBulkEditValue = (v: unknown): unknown => (v === '' ? null : v);

export type BulkEditRowStateResult<
  TRow extends { id: string },
  TDelta extends Record<string, unknown>,
> = {
  dirtyRows: Map<string, TDelta>;
  selectedRowIds: Set<string>;
  dirtyCount: number;
  selectedCount: number;
  setCellValue: <K extends keyof TDelta & keyof TRow>(
    id: string,
    field: K,
    value: TRow[K]
  ) => void;
  setCellValueOnRows: <K extends keyof TDelta & keyof TRow>(
    ids: string[],
    field: K,
    value: TRow[K]
  ) => void;
  clearDirty: () => void;
  toggleSelected: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  clearSucceededDirtyFields: (
    succeeded: string[],
    submittedById: Map<string, Record<string, unknown>>
  ) => void;
};

/**
 * Shared dirty-row and selection state for bulk-edit grids.
 * Domain hooks supply commit/validation/service logic on top of this.
 */
export const useBulkEditRowState = <
  TRow extends { id: string },
  TDelta extends Record<string, unknown>,
>(
  initialRows: TRow[]
): BulkEditRowStateResult<TRow, TDelta> => {
  const [dirtyRows, setDirtyRows] = useState<Map<string, TDelta>>(
    () => new Map()
  );
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(
    () => new Set()
  );

  const initialById = useMemo(() => {
    const map = new Map<string, TRow>();
    for (const row of initialRows) {
      map.set(row.id, row);
    }
    return map;
  }, [initialRows]);

  const setCellValue = useCallback(
    <K extends keyof TDelta & keyof TRow>(
      id: string,
      field: K,
      value: TRow[K]
    ) => {
      setDirtyRows((prev) => {
        const next = new Map(prev);
        const initial = initialById.get(id);
        const originalValue = initial?.[field];
        const existing = next.get(id) ?? ({} as TDelta);

        if (
          Object.is(normalizeBulkEditValue(value), normalizeBulkEditValue(originalValue))
        ) {
          if (field in existing) {
            const rest: Record<string, unknown> = {
              ...(existing as Record<string, unknown>),
            };
            delete rest[field as string];
            if (Object.keys(rest).length === 0) {
              next.delete(id);
            } else {
              next.set(id, rest as TDelta);
            }
          }
        } else {
          next.set(id, {
            ...existing,
            [field]: normalizeBulkEditValue(value),
          } as TDelta);
        }
        return next;
      });
    },
    [initialById]
  );

  const setCellValueOnRows = useCallback(
    <K extends keyof TDelta & keyof TRow>(
      ids: string[],
      field: K,
      value: TRow[K]
    ) => {
      ids.forEach((id) => setCellValue(id, field, value));
    },
    [setCellValue]
  );

  const clearDirty = useCallback(() => {
    setDirtyRows(new Map());
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedRowIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRowIds(new Set());
  }, []);

  const clearSucceededDirtyFields = useCallback(
    (succeeded: string[], submittedById: Map<string, Record<string, unknown>>) => {
      setDirtyRows((prev) => {
        const next = new Map(prev);
        for (const id of succeeded) {
          const submitted = submittedById.get(id);
          const current = next.get(id) as Record<string, unknown> | undefined;
          if (!submitted || !current) {
            next.delete(id);
            continue;
          }
          const remaining: Record<string, unknown> = { ...current };
          for (const [field, submittedValue] of Object.entries(submitted)) {
            if (
              field in remaining &&
              Object.is(remaining[field], submittedValue)
            ) {
              delete remaining[field];
            }
          }
          if (Object.keys(remaining).length === 0) {
            next.delete(id);
          } else {
            next.set(id, remaining as TDelta);
          }
        }
        return next;
      });
    },
    []
  );

  return {
    dirtyRows,
    selectedRowIds,
    dirtyCount: dirtyRows.size,
    selectedCount: selectedRowIds.size,
    setCellValue,
    setCellValueOnRows,
    clearDirty,
    toggleSelected,
    selectAll,
    clearSelection,
    clearSucceededDirtyFields,
  };
};
