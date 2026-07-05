import React, { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCreateInventoryItem, useUpdateInventoryItem } from '@/features/inventory/hooks/useInventory';
import { useEquipmentSummaries } from '@/features/equipment/hooks/useEquipment';
import {
  useAlternateGroups,
  useCreateAlternateGroup,
  useAddInventoryItemToGroup,
} from '@/features/inventory/hooks/useAlternateGroups';
import { inventoryItemFormSchema } from '@/features/inventory/schemas/inventorySchema';
import type { InventoryItem, PartCompatibilityRuleFormData } from '@/features/inventory/types/inventory';
import type { InventoryItemFormData } from '@/features/inventory/schemas/inventorySchema';
import { CompatibilityRulesEditor } from '@/features/inventory/components/CompatibilityRulesEditor';
import { InventoryItemFormBasicFields } from '@/features/inventory/components/InventoryItemFormBasicFields';
import { InventoryItemFormDirectLinksSection } from '@/features/inventory/components/InventoryItemFormDirectLinksSection';
import { InventoryItemFormAlternateGroupSection } from '@/features/inventory/components/InventoryItemFormAlternateGroupSection';
import { useInventoryItemFormEditingLoad } from '@/features/inventory/hooks/useInventoryItemFormEditingLoad';
import { useAppToast } from '@/hooks/useAppToast';
import { logger } from '@/utils/logger';

interface InventoryItemFormProps {
  open: boolean;
  onClose: () => void;
  editingItem?: InventoryItem | null;
}

const EMPTY_DEFAULTS: InventoryItemFormData = {
  name: '',
  description: '',
  sku: '',
  external_id: '',
  quantity_on_hand: 0,
  low_stock_threshold: 5,
  location: '',
  location_address: null,
  location_city: null,
  location_state: null,
  location_country: null,
  location_lat: null,
  location_lng: null,
  default_unit_cost: null,
  compatibleEquipmentIds: [],
  compatibilityRules: [],
  alternateGroupMode: 'none',
  alternateGroupId: null,
  newAlternateGroupName: null,
};

export const InventoryItemForm: React.FC<InventoryItemFormProps> = ({
  open,
  onClose,
  editingItem,
}) => {
  const { currentOrganization } = useOrganization();
  const { toast } = useAppToast();
  const lastInitKeyRef = useRef<string | null>(null);

  const createMutation = useCreateInventoryItem();
  const updateMutation = useUpdateInventoryItem();
  const createAlternateGroupMutation = useCreateAlternateGroup();
  const addToGroupMutation = useAddInventoryItemToGroup();

  const { data: allEquipment = [] } = useEquipmentSummaries(currentOrganization?.id, {
    enabled: open,
  });
  const { data: alternateGroups = [] } = useAlternateGroups(currentOrganization?.id, {
    enabled: open,
  });

  const form = useForm<InventoryItemFormData>({
    resolver: zodResolver(inventoryItemFormSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  const {
    isEditingDataLoaded,
    editingDataLoadError,
    resetEditingLoadState,
    markNewItemReady,
  } = useInventoryItemFormEditingLoad({
    open,
    editingItem,
    currentOrganizationId: currentOrganization?.id,
    form,
    toast,
  });

  useEffect(() => {
    if (!open) {
      lastInitKeyRef.current = null;
      return;
    }

    const initKey = editingItem?.id ?? '__new__';
    if (lastInitKeyRef.current === initKey) {
      return;
    }
    lastInitKeyRef.current = initKey;

    if (editingItem) {
      resetEditingLoadState();
      form.reset({
        name: editingItem.name,
        description: editingItem.description || '',
        sku: editingItem.sku || '',
        external_id: editingItem.external_id || '',
        quantity_on_hand: editingItem.quantity_on_hand,
        low_stock_threshold: editingItem.low_stock_threshold,
        location: editingItem.location || '',
        location_address: editingItem.location_address ?? null,
        location_city: editingItem.location_city ?? null,
        location_state: editingItem.location_state ?? null,
        location_country: editingItem.location_country ?? null,
        location_lat: editingItem.location_lat ?? null,
        location_lng: editingItem.location_lng ?? null,
        default_unit_cost: editingItem.default_unit_cost
          ? Number(editingItem.default_unit_cost)
          : null,
        compatibleEquipmentIds: [],
        compatibilityRules: [],
        alternateGroupMode: 'none',
        alternateGroupId: null,
        newAlternateGroupName: null,
      });
    } else {
      markNewItemReady();
      form.reset(EMPTY_DEFAULTS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by editingItem id via lastInitKeyRef
  }, [open, editingItem?.id]);

  const onSubmit = async (data: InventoryItemFormData) => {
    if (!currentOrganization) {
      return;
    }

    try {
      let createdItemId: string | null = null;

      if (editingItem) {
        await updateMutation.mutateAsync({
          organizationId: currentOrganization.id,
          itemId: editingItem.id,
          formData: data,
        });
        createdItemId = editingItem.id;
      } else {
        const createdItem = await createMutation.mutateAsync({
          organizationId: currentOrganization.id,
          formData: data,
        });
        createdItemId = createdItem.id;
      }

      if (createdItemId && data.alternateGroupMode !== 'none' && !editingItem) {
        try {
          let targetGroupId = data.alternateGroupId;

          if (data.alternateGroupMode === 'new' && data.newAlternateGroupName) {
            const newGroup = await createAlternateGroupMutation.mutateAsync({
              organizationId: currentOrganization.id,
              data: {
                name: data.newAlternateGroupName,
                status: 'unverified',
              },
            });
            targetGroupId = newGroup.id;
          }

          if (targetGroupId) {
            await addToGroupMutation.mutateAsync({
              organizationId: currentOrganization.id,
              groupId: targetGroupId,
              inventoryItemId: createdItemId,
              isPrimary: false,
            });
          }
        } catch (groupError) {
          logger.error('Error adding item to alternate group:', { error: groupError });
          toast({
            title: 'Item created',
            description: 'The item was created but could not be added to the alternate group.',
            variant: 'warning',
          });
        }
      }

      onClose();
    } catch (error) {
      logger.error('Error submitting inventory item form:', { error, editingItem: !!editingItem });
    }
  };

  const selectedEquipmentIds = form.watch('compatibleEquipmentIds') || [];

  const handleEquipmentToggle = (equipmentId: string, checked: boolean) => {
    const current = form.getValues('compatibleEquipmentIds') || [];
    if (checked) {
      form.setValue('compatibleEquipmentIds', [...current, equipmentId]);
    } else {
      form.setValue('compatibleEquipmentIds', current.filter(id => id !== equipmentId));
    }
  };

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    createAlternateGroupMutation.isPending ||
    addToGroupMutation.isPending;
  const isEditingDataPending = !!editingItem && !isEditingDataLoaded;
  const isFormDisabled = isMutating || isEditingDataPending || editingDataLoadError;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[calc(100dvh-2rem)] overflow-y-auto pb-safe-bottom">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? 'Edit Inventory Item' : 'Create Inventory Item'}
          </DialogTitle>
          <DialogDescription>
            {editingItem
              ? 'Update inventory item information'
              : 'Enter the details for the new inventory item'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-safe-bottom">
            <InventoryItemFormBasicFields form={form} editingItem={editingItem} />

            <FormField
              control={form.control}
              name="compatibilityRules"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <CompatibilityRulesEditor
                      rules={(field.value || []) as PartCompatibilityRuleFormData[]}
                      onChange={field.onChange}
                      disabled={isFormDisabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <InventoryItemFormDirectLinksSection
              allEquipment={allEquipment}
              selectedEquipmentIds={selectedEquipmentIds}
              onEquipmentToggle={handleEquipmentToggle}
            />

            {!editingItem && (
              <InventoryItemFormAlternateGroupSection
                form={form}
                alternateGroups={alternateGroups}
                isFormDisabled={isFormDisabled}
              />
            )}

            <div className="sticky bottom-0 z-10 -mx-6 flex justify-end space-x-2 border-t bg-background/95 px-6 py-3 pb-safe-bottom backdrop-blur supports-[backdrop-filter]:bg-background/90">
              <Button type="button" variant="outline" onClick={onClose} disabled={isFormDisabled}>
                Cancel
              </Button>
              <Button type="submit" disabled={isFormDisabled}>
                {isMutating
                  ? 'Saving...'
                  : editingDataLoadError
                    ? 'Load Failed'
                    : isEditingDataPending
                      ? 'Loading...'
                      : editingItem
                        ? 'Update Item'
                        : 'Create Item'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
