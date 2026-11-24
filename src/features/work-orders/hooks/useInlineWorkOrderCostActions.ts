import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOfflineQueueOptional } from '@/contexts/OfflineQueueContext';
import { OfflineAwareWorkOrderService } from '@/services/offlineAwareService';
import { findKnownInventoryItem } from '@/features/offline-queue/utils/queuedInventory';
import { useAppToast } from '@/hooks/useAppToast';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { useAdjustInventoryQuantity } from '@/features/inventory/hooks/useInventory';
import {
  useCreateWorkOrderCost,
  useUpdateWorkOrderCostWithInventory,
  useDeleteWorkOrderCostWithInventoryRestore,
} from '@/features/work-orders/hooks/useWorkOrderCosts';
import type { WorkOrderCost } from '@/features/work-orders/services/workOrderCostsService';
import type {
  AddFilledWorkOrderCostInput,
  WorkOrderCostItem,
} from '@/features/work-orders/hooks/useWorkOrderCostsState';

type CostValidationPhase = 'pristine' | 'dirty';

type UseInlineWorkOrderCostActionsParams = {
  workOrderId: string;
  costs: WorkOrderCost[];
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  setIsSaving: (value: boolean) => void;
  costValidationPhase: CostValidationPhase;
  setCostValidationPhase: (phase: CostValidationPhase) => void;
  getNewCosts: () => WorkOrderCostItem[];
  getUpdatedCosts: () => WorkOrderCostItem[];
  getDeletedCosts: () => WorkOrderCostItem[];
  getInventoryInfo: (id: string) => { quantity: number } | null;
  validateCosts: () => boolean;
  resetCosts: (costs: WorkOrderCost[]) => void;
  resetCostsWithMinimum: (costs: WorkOrderCost[]) => void;
  removeCost: (id: string) => void;
  addFilledCost: (cost: AddFilledWorkOrderCostInput) => void;
};

export function useInlineWorkOrderCostActions({
  workOrderId,
  costs,
  isEditing,
  setIsEditing,
  setIsSaving,
  setCostValidationPhase,
  getNewCosts,
  getUpdatedCosts,
  getDeletedCosts,
  getInventoryInfo,
  validateCosts,
  resetCosts,
  resetCostsWithMinimum,
  removeCost,
  addFilledCost,
}: UseInlineWorkOrderCostActionsParams) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { toast } = useAppToast();
  const queryClient = useQueryClient();
  const offlineCtx = useOfflineQueueOptional();
  // Connected, the stock deduction and the cost line are two requests. The
  // deduction must reach the server or fail here; it is never queued on its
  // own (offline the pair is queued together, see handleAddFromInventory).
  const adjustInventoryMutation = useAdjustInventoryQuantity({ requireServer: true });
  const createCostMutation = useCreateWorkOrderCost();
  const updateCostWithInventoryMutation = useUpdateWorkOrderCostWithInventory();
  const deleteCostWithInventoryMutation = useDeleteWorkOrderCostWithInventoryRestore();

  const [laborDialogOpen, setLaborDialogOpen] = useState(false);
  const [laborHours, setLaborHours] = useState('');
  const [laborRate, setLaborRate] = useState('');
  const [laborNote, setLaborNote] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [costToDelete, setCostToDelete] = useState<{
    id: string;
    hasInventory: boolean;
    quantity: number;
  } | null>(null);

  const handleStartEdit = useCallback(() => {
    resetCostsWithMinimum(costs);
    setCostValidationPhase('pristine');
    setIsEditing(true);
  }, [costs, resetCostsWithMinimum, setCostValidationPhase, setIsEditing]);

  const handleSave = useCallback(async () => {
    if (!validateCosts()) {
      setCostValidationPhase('dirty');
      return;
    }
    if (!currentOrganization) {
      return;
    }

    setIsSaving(true);
    try {
      const newCosts = getNewCosts();
      for (const cost of newCosts) {
        await createCostMutation.mutateAsync({
          work_order_id: workOrderId,
          description: cost.description,
          quantity: cost.quantity,
          unit_price_cents: cost.unit_price_cents,
        });
      }

      const updatedCosts = getUpdatedCosts();
      for (const cost of updatedCosts) {
        const originalCost = costs.find((entry) => entry.id === cost.id);
        if (
          originalCost &&
          (originalCost.description !== cost.description ||
            originalCost.quantity !== cost.quantity ||
            originalCost.unit_price_cents !== cost.unit_price_cents)
        ) {
          await updateCostWithInventoryMutation.mutateAsync({
            costId: cost.id,
            updateData: {
              description: cost.description,
              quantity: cost.quantity,
              unit_price_cents: cost.unit_price_cents,
            },
            organizationId: currentOrganization.id,
          });
        }
      }

      const deletedCosts = getDeletedCosts();
      for (const cost of deletedCosts) {
        await deleteCostWithInventoryMutation.mutateAsync({
          costId: cost.id,
          organizationId: currentOrganization.id,
        });
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Error saving costs:', error);
    } finally {
      setIsSaving(false);
    }
  }, [
    costs,
    createCostMutation,
    currentOrganization,
    deleteCostWithInventoryMutation,
    getDeletedCosts,
    getNewCosts,
    getUpdatedCosts,
    setCostValidationPhase,
    setIsEditing,
    setIsSaving,
    updateCostWithInventoryMutation,
    validateCosts,
    workOrderId,
  ]);

  const handleCancel = useCallback(() => {
    resetCosts(costs);
    setCostValidationPhase('pristine');
    setIsEditing(false);
  }, [costs, resetCosts, setCostValidationPhase, setIsEditing]);

  const resetLaborForm = useCallback(() => {
    setLaborHours('');
    setLaborRate('');
    setLaborNote('');
  }, []);

  const handleAddFromInventory = useCallback(
    async (itemId: string, quantity: number, unitCost: number) => {
      if (!currentOrganization || !user) return;

      // No connection (or earlier changes still waiting to sync): save the
      // cost line and the stock deduction together as one queued item.
      const offlineService = new OfflineAwareWorkOrderService(currentOrganization.id, user.id);
      if (offlineService.shouldQueue(workOrderId)) {
        const known = findKnownInventoryItem(
          queryClient,
          currentOrganization.id,
          itemId,
          offlineCtx?.queuedItems ?? [],
        );
        if (!known) {
          toast({
            title: 'Cannot add part',
            description: 'This part is not saved on this device. Try again when you are connected.',
            variant: 'error',
          });
          return;
        }
        // The server refuses to take more than is in stock; say so now.
        if (known.quantity_on_hand < quantity) {
          toast({
            title: 'Cannot add part',
            description: `Insufficient stock: Only ${known.quantity_on_hand} unit(s) available, but ${quantity} requested.`,
            variant: 'error',
          });
          return;
        }

        const costId = crypto.randomUUID();
        const unitPriceCents = Math.round(unitCost * 100);
        try {
          offlineService.queuePartUse({
            costId,
            workOrderId,
            itemId,
            description: known.name,
            quantity,
            unitPriceCents,
          });
        } catch (error) {
          toast({
            title: 'Cannot add part',
            description: error instanceof Error ? error.message : 'Could not save this part on the device.',
            variant: 'error',
          });
          return;
        }
        offlineCtx?.refresh();

        if (isEditing) {
          setCostValidationPhase('dirty');
          addFilledCost({
            id: costId,
            work_order_id: workOrderId,
            description: known.name,
            quantity,
            unit_price_cents: unitPriceCents,
            inventory_item_id: itemId,
            original_quantity: quantity,
          });
        }
        toast({
          title: 'Part saved offline',
          description: `${quantity} unit(s) of ${known.name} will be added to the work order and taken from inventory when your connection returns.`,
        });
        return;
      }

      try {
        const { data: currentItem, error: fetchError } = await supabase
          .from('inventory_items')
          .select('quantity_on_hand, name')
          .eq('id', itemId)
          .eq('organization_id', currentOrganization.id)
          .single();

        if (fetchError || !currentItem) {
          toast({
            title: 'Error',
            description: 'Failed to fetch inventory item details',
            variant: 'error',
          });
          return;
        }

        if (currentItem.quantity_on_hand < quantity) {
          toast({
            title: 'Insufficient stock',
            description: `Available: ${currentItem.quantity_on_hand}, Requested: ${quantity}. The request will be rejected if stock is insufficient.`,
            variant: 'warning',
          });
        }

        const newQuantity = await adjustInventoryMutation.mutateAsync({
          organizationId: currentOrganization.id,
          adjustment: {
            itemId,
            delta: -quantity,
            reason: `Used in work order ${workOrderId}`,
            workOrderId,
          },
        });

        const itemName = currentItem.name || `Inventory item (ID: ${itemId.substring(0, 8)}...)`;
        const unitPriceCents = Math.round(unitCost * 100);

        const createdCost = await createCostMutation.mutateAsync({
          work_order_id: workOrderId,
          description: itemName,
          quantity,
          unit_price_cents: unitPriceCents,
          inventory_item_id: itemId,
          original_quantity: quantity,
        });

        if (isEditing) {
          setCostValidationPhase('dirty');
        }

        if (isEditing) {
          addFilledCost({
            id: createdCost.id,
            work_order_id: workOrderId,
            description: itemName,
            quantity,
            unit_price_cents: unitPriceCents,
            inventory_item_id: itemId,
            original_quantity: quantity,
          });
        }

        toast({
          title: 'Part added',
          description: `Added ${quantity} unit(s) from inventory to work order. Remaining stock: ${newQuantity}`,
        });
      } catch (error) {
        console.error('Error adding part from inventory:', error);

        const errorMessage =
          error instanceof Error
            ? error.message
            : error && typeof error === 'object' && 'message' in error
              ? String((error as { message: unknown }).message)
              : error && typeof error === 'object' && 'details' in error
                ? String((error as { details: unknown }).details)
                : String(error);

        if (errorMessage.includes('Insufficient stock')) {
          const match = errorMessage.match(
            /Insufficient stock: requested (\d+) units, but only (\d+) available/,
          );
          if (match) {
            toast({
              title: 'Cannot add part',
              description: `Insufficient stock: Only ${match[2]} unit(s) available, but ${match[1]} requested. The quantity may have changed since you selected this item.`,
              variant: 'error',
            });
          } else {
            toast({
              title: 'Cannot add part',
              description:
                'Insufficient stock available. The quantity may have changed since you selected this item.',
              variant: 'error',
            });
          }
        }
      }
    },
    [
      addFilledCost,
      adjustInventoryMutation,
      createCostMutation,
      currentOrganization,
      offlineCtx,
      queryClient,
      isEditing,
      setCostValidationPhase,
      toast,
      user,
      workOrderId,
    ],
  );

  const handleConfirmLabor = useCallback(async () => {
    const hours = Number(laborHours);
    const rate = Number.parseFloat(laborRate);
    if (!Number.isFinite(hours) || hours <= 0) {
      toast({
        title: 'Invalid hours',
        description: 'Enter billable hours greater than zero.',
        variant: 'error',
      });
      return;
    }
    if (!Number.isFinite(rate) || rate < 0) {
      toast({
        title: 'Invalid rate',
        description: 'Enter a valid hourly rate (0 or more).',
        variant: 'error',
      });
      return;
    }

    const unitPriceCents = Math.round(rate * 100);
    const trimmedNote = laborNote.trim();
    const description = trimmedNote ? `Labor - ${trimmedNote}` : 'Labor';

    try {
      if (isEditing) {
        setCostValidationPhase('dirty');
      }
      const createdCost = await createCostMutation.mutateAsync({
        work_order_id: workOrderId,
        description,
        quantity: hours,
        unit_price_cents: unitPriceCents,
      });

      if (isEditing) {
        addFilledCost({
          id: createdCost.id,
          work_order_id: workOrderId,
          description: createdCost.description,
          quantity: createdCost.quantity,
          unit_price_cents: createdCost.unit_price_cents,
          inventory_item_id: null,
          original_quantity: null,
        });
      }

      setLaborDialogOpen(false);
      resetLaborForm();
    } catch (error) {
      console.error('Error adding labor cost:', error);
    }
  }, [
    addFilledCost,
    createCostMutation,
    isEditing,
    laborHours,
    laborNote,
    laborRate,
    resetLaborForm,
    setCostValidationPhase,
    toast,
    workOrderId,
  ]);

  const handleRemoveCost = useCallback(
    (id: string) => {
      const inventoryInfo = getInventoryInfo(id);
      if (inventoryInfo) {
        setCostToDelete({
          id,
          hasInventory: true,
          quantity: inventoryInfo.quantity,
        });
        setDeleteConfirmOpen(true);
      } else {
        setCostValidationPhase('dirty');
        removeCost(id);
      }
    },
    [getInventoryInfo, removeCost, setCostValidationPhase],
  );

  const confirmDelete = useCallback(() => {
    setCostValidationPhase('dirty');
    if (costToDelete) {
      removeCost(costToDelete.id);
      setCostToDelete(null);
    }
    setDeleteConfirmOpen(false);
  }, [costToDelete, removeCost, setCostValidationPhase]);

  return {
    laborDialogOpen,
    setLaborDialogOpen,
    laborHours,
    setLaborHours,
    laborRate,
    setLaborRate,
    laborNote,
    setLaborNote,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    costToDelete,
    setCostToDelete,
    handleStartEdit,
    handleSave,
    handleCancel,
    handleAddFromInventory,
    handleConfirmLabor,
    handleRemoveCost,
    confirmDelete,
    resetLaborForm,
    createCostMutation,
  };
}
