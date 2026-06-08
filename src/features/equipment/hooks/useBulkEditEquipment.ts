import { useMemo } from 'react';
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
import {
  bulkEditMutationOnError,
  useBulkEditCommitResult,
  type BulkEditCommitHookResult,
} from '@/hooks/useBulkEditCommitResult';
import { useBulkEditRowState } from '@/hooks/useBulkEditRowState';

/**
 * Field-level delta for a single equipment row. Only the fields the user has
 * actually changed are present.
 */
export type EquipmentRowDelta = Partial<EquipmentRecord>;

export type UseBulkEditEquipmentResult = BulkEditCommitHookResult<
  EquipmentRecord,
  EquipmentRowDelta
>;

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

  const rowState = useBulkEditRowState<EquipmentRecord, EquipmentRowDelta>(initialRows);
  const { dirtyRows, clearSucceededDirtyFields } = rowState;

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
    onError: bulkEditMutationOnError,
  });

  return useBulkEditCommitResult(rowState, commitMutation);
};
