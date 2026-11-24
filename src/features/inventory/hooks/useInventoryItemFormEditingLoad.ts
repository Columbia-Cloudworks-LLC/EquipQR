import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import type { InventoryItemFormApi } from '@/features/inventory/schemas/inventorySchema';
import {
  mapInventoryCompatibilityRules,
  shouldIgnoreStaleInventoryItemEditingLoad,
} from '@/features/inventory/utils/inventoryItemEditingLoadHelpers';
import type { ToastVariant } from '@/hooks/useAppToast';
import { logger } from '@/utils/logger';

type ToastFn = (args: {
  title: string;
  description?: string;
  variant?: ToastVariant;
}) => void;

type UseInventoryItemFormEditingLoadParams = {
  open: boolean;
  editingItem?: InventoryItem | null;
  currentOrganizationId?: string;
  form: InventoryItemFormApi;
  toast: ToastFn;
};

export function useInventoryItemFormEditingLoad({
  open,
  editingItem,
  currentOrganizationId,
  form,
  toast,
}: UseInventoryItemFormEditingLoadParams) {
  const [isEditingDataLoaded, setIsEditingDataLoaded] = useState(false);
  const [editingDataLoadError, setEditingDataLoadError] = useState(false);
  // False when the item's equipment links and compatibility rules could not
  // be read (no connection). The form then shows them as empty, and saving
  // them would erase the real ones, so the caller must leave them out.
  const [relationshipsLoaded, setRelationshipsLoaded] = useState(true);
  const currentEditingItemIdRef = useRef<string | null>(null);
  const formRef = useRef(form);
  formRef.current = form;
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const editingItemId = editingItem?.id;
  const editingItemOrgId = editingItem?.organization_id;

  useEffect(() => {
    const abortController = new AbortController();

    if (editingItemId && currentOrganizationId) {
      const itemId = editingItemId;
      currentEditingItemIdRef.current = itemId;

      const loadEditingData = async () => {
        try {
          if (editingItemOrgId !== currentOrganizationId) {
            logger.error('Security: editingItem organization mismatch', {
              itemOrgId: editingItemOrgId,
              currentOrgId: currentOrganizationId,
            });
            throw new Error('Security: editingItem organization mismatch');
          }

          if (abortController.signal.aborted) return;

          const { data: compatibilityData, error: compatibilityError } = await supabase
            .from('equipment_part_compatibility')
            .select(`
              equipment_id,
              inventory_items!inner(organization_id)
            `)
            .eq('inventory_item_id', itemId)
            .eq('inventory_items.organization_id', currentOrganizationId);

          if (shouldIgnoreStaleInventoryItemEditingLoad(abortController, currentEditingItemIdRef, itemId)) {
            return;
          }

          const equipmentIds = (compatibilityData || []).map(row => row.equipment_id);

          const { data: rulesData, error: rulesError } = await supabase
            .from('part_compatibility_rules')
            .select(`
              manufacturer,
              model,
              match_type,
              status,
              notes,
              inventory_items!inner(organization_id)
            `)
            .eq('inventory_item_id', itemId)
            .eq('inventory_items.organization_id', currentOrganizationId);

          if (shouldIgnoreStaleInventoryItemEditingLoad(abortController, currentEditingItemIdRef, itemId)) {
            return;
          }

          if (compatibilityError || rulesError) {
            // The rest of the item can still be edited; these are left as they are.
            setRelationshipsLoaded(false);
            setIsEditingDataLoaded(true);
            return;
          }

          const rules = mapInventoryCompatibilityRules(rulesData);
          setRelationshipsLoaded(true);
          formRef.current.setValue('compatibleEquipmentIds', equipmentIds);
          formRef.current.setValue('compatibilityRules', rules);

          if (!abortController.signal.aborted) {
            setIsEditingDataLoaded(true);
          }
        } catch (error) {
          if (abortController.signal.aborted || currentEditingItemIdRef.current !== itemId) {
            return;
          }
          logger.error('Error loading editing data:', error);
          if (!abortController.signal.aborted) {
            setEditingDataLoadError(true);
            toastRef.current({
              title: 'Failed to load item data',
              description:
                'Could not load compatibility rules and settings. Please close and try again.',
              variant: 'error',
            });
          }
        }
      };

      loadEditingData();
    }

    return () => {
      abortController.abort();
    };
  }, [editingItemId, editingItemOrgId, currentOrganizationId]);

  const resetEditingLoadState = () => {
    setIsEditingDataLoaded(false);
    setEditingDataLoadError(false);
    setRelationshipsLoaded(true);
    // `currentEditingItemIdRef` is left alone: the form calls this right
    // after the load for the item it just opened has started, and clearing
    // the ref made that load discard its own result, leaving the form on
    // "Loading..." for good. The load effect sets the ref for each new item.
  };

  const markNewItemReady = () => {
    setIsEditingDataLoaded(true);
    setEditingDataLoadError(false);
    setRelationshipsLoaded(true);
  };

  return {
    isEditingDataLoaded,
    editingDataLoadError,
    relationshipsLoaded,
    resetEditingLoadState,
    markNewItemReady,
  };
}
