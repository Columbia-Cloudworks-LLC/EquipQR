import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useOrganization } from '@/contexts/OrganizationContext';
import { equipment as equipmentKeys } from '@/lib/queryKeys';
import {
  EquipmentService,
  type EquipmentUpdateData,
} from '@/features/equipment/services/EquipmentService';
import {
  equipmentFormSchema,
  type EquipmentRecord,
} from '@/features/equipment/types/equipment';

/**
 * Field-level delta for a single equipment row. Only the fields the user has
 * actually changed are present.
 */
export type EquipmentRowDelta = Partial<EquipmentRecord>;

export interface UseBulkEditEquipmentResult {
  /** Map of equipment id -> field-level delta. Entries are removed when the
   *  user reverts every changed field on a row back to its original value. */
  dirtyRows: Map<string, EquipmentRowDelta>;
  /** Currently checkbox-selected row ids. */
  selectedRowIds: Set<string>;
  /** Number of rows with at least one dirty field. */
  dirtyCount: number;
  /** Number of selected rows. */
  selectedCount: number;
  /** True while the batch commit mutation is in flight. */
  isPending: boolean;

  /** Set a single field on a single row. Reverting to the initial value clears the delta. */
  setCellValue: <K extends keyof EquipmentRecord>(
    id: string,
    field: K,
    value: EquipmentRecord[K]
  ) => void;
  /** Apply the same field/value to many rows at once (used by the bulk-apply confirmation dialog). */
  setCellValueOnRows: <K extends keyof EquipmentRecord>(
    ids: string[],
    field: K,
    value: EquipmentRecord[K]
  ) => void;
  /** Discard every dirty edit. */
  clearDirty: () => void;
  /** Toggle whether a single row is selected. */
  toggleSelected: (id: string) => void;
  /** Replace the selection with the given ids. */
  selectAll: (ids: string[]) => void;
  /** Clear the row selection (does not affect dirty state). */
  clearSelection: () => void;
  /** Commit every dirty row to Supabase via `EquipmentService.batchUpdate`. */
  commit: () => Promise<void>;
}

/**
 * Local state + commit logic for the bulk-edit equipment grid (#627).
 *
 * Stores per-row, per-field deltas in a `Map` so the grid can render dirty
 * indicators and discard semantics without re-walking every row. On commit,
 * each delta is validated with `equipmentFormSchema.partial()` (zod) and the
 * survivors are sent to `EquipmentService.batchUpdate` in a single batched call
 * with partial-tolerant semantics — see the service method for details.
 *
 * Invalidates the per-org `equipment.list` query on success so the source list
 * page refreshes after the user navigates back.
 */
export const useBulkEditEquipment = (
  initialRows: EquipmentRecord[]
): UseBulkEditEquipmentResult => {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  const [dirtyRows, setDirtyRows] = useState<Map<string, EquipmentRowDelta>>(
    () => new Map()
  );
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(
    () => new Set()
  );

  const initialById = useMemo(() => {
    const map = new Map<string, EquipmentRecord>();
    for (const row of initialRows) {
      map.set(row.id, row);
    }
    return map;
  }, [initialRows]);

  const setCellValue = useCallback(
    <K extends keyof EquipmentRecord>(
      id: string,
      field: K,
      value: EquipmentRecord[K]
    ) => {
      setDirtyRows((prev) => {
        const next = new Map(prev);
        const initial = initialById.get(id);
        const originalValue = initial?.[field];
        const existing = next.get(id) ?? {};
        if (Object.is(value, originalValue)) {
          // Revert: drop the field from the delta; drop the row entirely if it has no other deltas.
          if (field in existing) {
            const rest: Record<string, unknown> = { ...(existing as Record<string, unknown>) };
            delete rest[field as string];
            if (Object.keys(rest).length === 0) {
              next.delete(id);
            } else {
              next.set(id, rest as EquipmentRowDelta);
            }
          }
        } else {
          next.set(id, { ...existing, [field]: value } as EquipmentRowDelta);
        }
        return next;
      });
    },
    [initialById]
  );

  const setCellValueOnRows = useCallback(
    <K extends keyof EquipmentRecord>(
      ids: string[],
      field: K,
      value: EquipmentRecord[K]
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

  const partialSchema = useMemo(() => equipmentFormSchema.partial(), []);

  const commitMutation = useMutation({
    mutationFn: async () => {
      const orgId = currentOrganization?.id;
      if (!orgId) {
        throw new Error('Organization not selected');
      }

      const validUpdates: Array<{ id: string; data: EquipmentUpdateData }> = [];
      const validationFailures: Array<{ id: string; error: string }> = [];

      for (const [id, delta] of dirtyRows) {
        const parsed = partialSchema.safeParse(delta);
        if (!parsed.success) {
          const message = parsed.error.issues
            .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
            .join('; ');
          validationFailures.push({ id, error: message || 'Invalid value' });
        } else {
          validUpdates.push({ id, data: delta as EquipmentUpdateData });
        }
      }

      const result = await EquipmentService.batchUpdate(orgId, validUpdates);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? 'Bulk update failed');
      }

      return {
        succeeded: result.data.succeeded,
        failed: [...validationFailures, ...result.data.failed],
        attempted: dirtyRows.size,
      };
    },
    onSuccess: (summary) => {
      const { succeeded, failed, attempted } = summary;
      if (failed.length === 0) {
        toast.success(`Updated ${succeeded.length} equipment`);
        // Drop only the rows that committed successfully; preserve any failures
        // so the user can retry. (When everything succeeded, this clears all.)
        setDirtyRows(new Map());
      } else if (succeeded.length === 0) {
        toast.error(`Failed to update ${failed.length} of ${attempted} equipment`);
      } else {
        toast.warning(
          `Updated ${succeeded.length} of ${attempted}; ${failed.length} failed`
        );
        setDirtyRows((prev) => {
          const next = new Map(prev);
          for (const id of succeeded) next.delete(id);
          return next;
        });
      }

      const orgId = currentOrganization?.id;
      if (orgId && succeeded.length > 0) {
        queryClient.invalidateQueries({ queryKey: equipmentKeys.list(orgId) });
        for (const id of succeeded) {
          queryClient.invalidateQueries({ queryKey: equipmentKeys.byId(orgId, id) });
        }
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Bulk update failed');
    },
  });

  const commit = useCallback(async () => {
    if (dirtyRows.size === 0) return;
    await commitMutation.mutateAsync();
  }, [commitMutation, dirtyRows.size]);

  return {
    dirtyRows,
    selectedRowIds,
    dirtyCount: dirtyRows.size,
    selectedCount: selectedRowIds.size,
    isPending: commitMutation.isPending,
    setCellValue,
    setCellValueOnRows,
    clearDirty,
    toggleSelected,
    selectAll,
    clearSelection,
    commit,
  };
};
