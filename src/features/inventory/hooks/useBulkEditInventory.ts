import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

import { useOrganization } from '@/contexts/OrganizationContext';
import { inventory as inventoryKeys } from '@/lib/queryKeys';
import { usePermissions } from '@/hooks/usePermissions';
import {
  batchUpdateInventoryItems,
  adjustInventoryQuantity,
  type InventoryBulkUpdateData,
} from '@/features/inventory/services/inventoryService';
import type { InventoryItem } from '@/features/inventory/types/inventory';

// ============================================
// Types
// ============================================

/** Editable scalar fields exposed by the bulk grid. */
export type BulkEditableField =
  | 'name'
  | 'sku'
  | 'external_id'
  | 'location'
  | 'quantity_on_hand'
  | 'low_stock_threshold'
  | 'default_unit_cost';

/** Per-row, per-field delta. Only fields the user actually changed are present. */
export type InventoryRowDelta = Partial<Pick<InventoryItem, BulkEditableField>>;

export interface UseBulkEditInventoryResult {
  dirtyRows: Map<string, InventoryRowDelta>;
  selectedRowIds: Set<string>;
  dirtyCount: number;
  selectedCount: number;
  isPending: boolean;

  setCellValue: <K extends BulkEditableField>(
    id: string,
    field: K,
    value: InventoryItem[K]
  ) => void;
  setCellValueOnRows: <K extends BulkEditableField>(
    ids: string[],
    field: K,
    value: InventoryItem[K]
  ) => void;
  clearDirty: () => void;
  toggleSelected: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  commit: () => Promise<void>;
}

// ============================================
// Validation schema for bulk-editable scalar fields
// Defined independently to avoid the `.refine()` wrapper on inventoryItemFormSchema
// ============================================

const bulkEditSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  sku: z.string().max(100).nullable().optional(),
  external_id: z.string().max(100).nullable().optional(),
  location: z.string().max(255).nullable().optional(),
  quantity_on_hand: z.number().int().min(-10000).optional(),
  low_stock_threshold: z.number().int().min(1).optional(),
  default_unit_cost: z.number().min(0).max(999999.99).nullable().optional(),
}).partial();

type BulkEditSchemaInput = z.infer<typeof bulkEditSchema>;

// ============================================
// Normalize helper — mirrors the equipment grid
// ============================================

const normalize = (v: unknown): unknown => (v === '' ? null : v);

// ============================================
// Hook
// ============================================

export const useBulkEditInventory = (
  initialRows: InventoryItem[],
  options: { canCommit?: boolean } = {}
): UseBulkEditInventoryResult => {
  const { currentOrganization } = useOrganization();
  const { canManageInventory } = usePermissions();
  const queryClient = useQueryClient();

  const [dirtyRows, setDirtyRows] = useState<Map<string, InventoryRowDelta>>(
    () => new Map()
  );
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(
    () => new Set()
  );

  // Stable lookup of initial values keyed by item id.
  const initialById = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    for (const row of initialRows) {
      map.set(row.id, row);
    }
    return map;
  }, [initialRows]);

  // ── Cell mutations ────────────────────────────────────────────────────────

  const setCellValue = useCallback(
    <K extends BulkEditableField>(
      id: string,
      field: K,
      value: InventoryItem[K]
    ) => {
      setDirtyRows((prev) => {
        const next = new Map(prev);
        const initial = initialById.get(id);
        const originalValue = initial?.[field];
        const existing = next.get(id) ?? {};

        if (Object.is(normalize(value), normalize(originalValue))) {
          // Revert: remove field; drop row entry if no other fields remain.
          if (field in existing) {
            const rest = { ...(existing as Record<string, unknown>) };
            delete rest[field as string];
            if (Object.keys(rest).length === 0) {
              next.delete(id);
            } else {
              next.set(id, rest as InventoryRowDelta);
            }
          }
        } else {
          next.set(id, {
            ...existing,
            [field]: normalize(value),
          } as InventoryRowDelta);
        }
        return next;
      });
    },
    [initialById]
  );

  const setCellValueOnRows = useCallback(
    <K extends BulkEditableField>(
      ids: string[],
      field: K,
      value: InventoryItem[K]
    ) => {
      ids.forEach((id) => setCellValue(id, field, value));
    },
    [setCellValue]
  );

  const clearDirty = useCallback(() => {
    setDirtyRows(new Map());
  }, []);

  // ── Row selection ─────────────────────────────────────────────────────────

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

  // ── Commit mutation ───────────────────────────────────────────────────────

  const commitMutation = useMutation({
    mutationFn: async () => {
      const orgId = currentOrganization?.id;
      if (!orgId) throw new Error('Organization not selected');
      const canCommit = options.canCommit ?? canManageInventory(false);
      if (!canCommit) {
        throw new Error('You do not have permission to bulk edit inventory');
      }

      type RowSummary = {
        metadataSuccess: boolean;
        quantitySuccess: boolean;
        metadataError?: string;
        quantityError?: string;
      };
      const rowSummaries = new Map<string, RowSummary>();

      // Validate every dirty row and split into metadata vs. quantity updates.
      const metadataUpdates: Array<{ id: string; data: InventoryBulkUpdateData }> = [];
      const quantityUpdates: Array<{
        id: string;
        delta: number;
        initialQty: number;
        nextQty: number;
      }> = [];
      const validationFailures: Array<{ id: string; error: string }> = [];

      for (const [id, delta] of dirtyRows) {
        const parsed = bulkEditSchema.safeParse(delta as BulkEditSchemaInput);
        if (!parsed.success) {
          const msg = parsed.error.issues
            .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
            .join('; ');
          validationFailures.push({ id, error: msg || 'Invalid value' });
          continue;
        }

        const validData = parsed.data;
        const initial = initialById.get(id);
        if (!initial) {
          validationFailures.push({ id, error: 'Row not found in initial data' });
          continue;
        }

        // Separate quantity from metadata.
        const { quantity_on_hand, ...metaFields } = validData;

        if (Object.keys(metaFields).length > 0) {
          metadataUpdates.push({ id, data: metaFields as InventoryBulkUpdateData });
        }

        if (quantity_on_hand !== undefined && quantity_on_hand !== null) {
          const initialQty = initial.quantity_on_hand;
          const delta = quantity_on_hand - initialQty;
          if (delta !== 0) {
            quantityUpdates.push({ id, delta, initialQty, nextQty: quantity_on_hand });
          }
        }
      }

      // Mark validation failures immediately.
      for (const { id, error } of validationFailures) {
        rowSummaries.set(id, {
          metadataSuccess: false,
          quantitySuccess: false,
          metadataError: error,
          quantityError: error,
        });
      }

      // Run metadata batch update.
      if (metadataUpdates.length > 0) {
        const { succeeded, failed } = await batchUpdateInventoryItems(orgId, metadataUpdates);
        for (const id of succeeded) {
          const existing = rowSummaries.get(id) ?? { metadataSuccess: true, quantitySuccess: true };
          rowSummaries.set(id, { ...existing, metadataSuccess: true });
        }
        for (const { id, error } of failed) {
          const existing = rowSummaries.get(id) ?? { metadataSuccess: false, quantitySuccess: true };
          rowSummaries.set(id, { ...existing, metadataSuccess: false, metadataError: error });
        }
      }

      // Run quantity adjustments individually (each preserves inventory_transactions).
      for (const { id, delta } of quantityUpdates) {
        try {
          await adjustInventoryQuantity(orgId, {
            itemId: id,
            delta,
            reason: 'Bulk inventory grid adjustment',
          });
          const existing = rowSummaries.get(id) ?? { metadataSuccess: true, quantitySuccess: true };
          rowSummaries.set(id, { ...existing, quantitySuccess: true });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Quantity adjustment failed';
          const existing = rowSummaries.get(id) ?? { metadataSuccess: true, quantitySuccess: false };
          rowSummaries.set(id, { ...existing, quantitySuccess: false, quantityError: msg });
        }
      }

      // Build result lists for the mutation's onSuccess handler.
      const succeeded: string[] = [];
      const failed: Array<{ id: string; error: string }> = [];

      // A row is fully succeeded if EVERY update it needed worked.
      for (const [id, delta] of dirtyRows) {
        const { quantity_on_hand, ...metaFields } = (delta as Record<string, unknown>);
        const needsMeta = Object.keys(metaFields).length > 0;
        const needsQty =
          quantity_on_hand !== undefined &&
          quantity_on_hand !== null &&
          (() => {
            const initial = initialById.get(id);
            return initial ? (quantity_on_hand as number) - initial.quantity_on_hand !== 0 : false;
          })();

        const summary = rowSummaries.get(id);
        if (!summary) {
          // Validation failure — keep as dirty
          failed.push({ id, error: 'Validation failed' });
          continue;
        }

        const metaOk = !needsMeta || summary.metadataSuccess;
        const qtyOk = !needsQty || summary.quantitySuccess;

        if (metaOk && qtyOk) {
          succeeded.push(id);
        } else {
          const errors = [
            !metaOk && summary.metadataError,
            !qtyOk && summary.quantityError,
          ]
            .filter(Boolean)
            .join('; ');
          failed.push({ id, error: errors || 'Update failed' });
        }
      }

      // Build a map of submitted metadata (for partial-dirty-clear on success).
      const submittedMetaById = new Map(
        metadataUpdates.map((u) => [u.id, u.data as Record<string, unknown>])
      );
      const submittedQtyById = new Map(
        quantityUpdates.map((u) => [u.id, u.nextQty])
      );

      return {
        succeeded,
        failed,
        attempted: dirtyRows.size,
        submittedMetaById,
        submittedQtyById,
      };
    },

    onSuccess: (summary) => {
      const { succeeded, failed, attempted, submittedMetaById, submittedQtyById } = summary;

      if (failed.length === 0) {
        toast.success(`Updated ${succeeded.length} ${succeeded.length === 1 ? 'item' : 'items'}`);
      } else if (succeeded.length === 0) {
        toast.error(`Failed to update ${failed.length} of ${attempted} ${attempted === 1 ? 'item' : 'items'}`);
      } else {
        toast.warning(
          `Updated ${succeeded.length} of ${attempted}; ${failed.length} failed`
        );
      }

      if (succeeded.length > 0) {
        // Strip only the specific fields that were successfully committed and
        // still match the submitted value — any concurrent edits stay dirty.
        setDirtyRows((prev) => {
          const next = new Map(prev);
          for (const id of succeeded) {
            const submittedMeta = submittedMetaById.get(id) ?? {};
            const submittedQty = submittedQtyById.get(id);
            const current = next.get(id) as Record<string, unknown> | undefined;
            if (!current) {
              next.delete(id);
              continue;
            }
            const remaining: Record<string, unknown> = { ...current };
            for (const [field, submittedValue] of Object.entries(submittedMeta)) {
              if (field in remaining && Object.is(remaining[field], submittedValue)) {
                delete remaining[field];
              }
            }
            if (submittedQty !== undefined && 'quantity_on_hand' in remaining) {
              if (Object.is(remaining['quantity_on_hand'], submittedQty)) {
                delete remaining['quantity_on_hand'];
              }
            }
            if (Object.keys(remaining).length === 0) {
              next.delete(id);
            } else {
              next.set(id, remaining as InventoryRowDelta);
            }
          }
          return next;
        });

        // Invalidate inventory queries for affected items.
        const orgId = currentOrganization?.id;
        if (orgId) {
          queryClient.invalidateQueries({ queryKey: ['inventory-items', orgId] });
          queryClient.invalidateQueries({ queryKey: ['inventory-list-metadata', orgId] });
          for (const id of succeeded) {
            queryClient.invalidateQueries({ queryKey: ['inventory-item', orgId, id] });
            queryClient.invalidateQueries({ queryKey: ['inventory-transactions', orgId, id] });
          }
          queryClient.invalidateQueries({ queryKey: inventoryKeys.root });
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
