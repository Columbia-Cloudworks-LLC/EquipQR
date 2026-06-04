import { useCallback, useMemo } from 'react';
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
import { useBulkEditRowState } from '@/hooks/useBulkEditRowState';

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

  const {
    dirtyRows,
    selectedRowIds,
    dirtyCount,
    selectedCount,
    setCellValue,
    setCellValueOnRows,
    clearDirty,
    toggleSelected,
    selectAll,
    clearSelection,
    clearSucceededDirtyFields,
  } = useBulkEditRowState<EquipmentRecord, EquipmentRowDelta>(initialRows);

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
          // Use `parsed.data` (not the raw `delta`) so zod's allow-list strips
          // any unknown keys that snuck into the cell-edit payload before they
          // reach Supabase. With the partial schema this is defense-in-depth:
          // `setCellValue` is typed against `EquipmentRecord`, but the edit
          // grid evolves independently of the wire schema and we want the
          // validation layer to be the single source of truth on what fields
          // are allowed in a row update.
          validUpdates.push({ id, data: parsed.data as EquipmentUpdateData });
        }
      }

      const result = await EquipmentService.batchUpdate(orgId, validUpdates);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? 'Bulk update failed');
      }

      const submittedById = new Map(
        validUpdates.map((u) => [u.id, u.data as Record<string, unknown>])
      );

      return {
        succeeded: result.data.succeeded,
        failed: [...validationFailures, ...result.data.failed],
        attempted: dirtyRows.size,
        submittedById,
      };
    },
    onSuccess: (summary) => {
      const { succeeded, failed, attempted, submittedById } = summary;
      if (failed.length === 0) {
        toast.success(`Updated ${succeeded.length} equipment`);
      } else if (succeeded.length === 0) {
        toast.error(`Failed to update ${failed.length} of ${attempted} equipment`);
      } else {
        toast.warning(
          `Updated ${succeeded.length} of ${attempted}; ${failed.length} failed`
        );
      }

      if (succeeded.length > 0) {
        clearSucceededDirtyFields(succeeded, submittedById);
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
    dirtyCount,
    selectedCount,
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
