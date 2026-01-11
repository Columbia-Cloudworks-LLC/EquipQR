import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, Forklift, Users, Check, X } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCreateInventoryItem, useUpdateInventoryItem } from '@/features/inventory/hooks/useInventory';
import { useEquipment } from '@/features/equipment/hooks/useEquipment';
import { useOrganizationMembers } from '@/features/organization/hooks/useOrganizationMembers';
import { supabase } from '@/integrations/supabase/client';
import { inventoryItemFormSchema } from '@/features/inventory/schemas/inventorySchema';
import type { InventoryItem, PartCompatibilityRuleFormData } from '@/features/inventory/types/inventory';
import type { InventoryItemFormData } from '@/features/inventory/schemas/inventorySchema';
import { CompatibilityRulesEditor } from '@/features/inventory/components/CompatibilityRulesEditor';
import { useAppToast } from '@/hooks/useAppToast';
import { logger } from '@/utils/logger';

interface InventoryItemFormProps {
  open: boolean;
  onClose: () => void;
  editingItem?: InventoryItem | null;
}

export const InventoryItemForm: React.FC<InventoryItemFormProps> = ({
  open,
  onClose,
  editingItem
}) => {
  const { currentOrganization } = useOrganization();
  const { toast } = useAppToast();
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [managerSearch, setManagerSearch] = useState('');
  // Track whether async editing data (compatibility rules, equipment links, managers) has loaded
  const [isEditingDataLoaded, setIsEditingDataLoaded] = useState(false);
  // Track if loading failed - prevents form submission with stale/empty data
  const [editingDataLoadError, setEditingDataLoadError] = useState(false);
  // Ref to track current item ID to prevent race conditions when rapidly opening/closing form
  const currentEditingItemIdRef = useRef<string | null>(null);

  const createMutation = useCreateInventoryItem();
  const updateMutation = useUpdateInventoryItem();

  const { data: allEquipment = [] } = useEquipment(currentOrganization?.id);
  const { data: members = [] } = useOrganizationMembers(currentOrganization?.id ?? '');

  const form = useForm<InventoryItemFormData>({
    resolver: zodResolver(inventoryItemFormSchema),
    defaultValues: {
      name: '',
      description: '',
      sku: '',
      external_id: '',
      quantity_on_hand: 0,
      low_stock_threshold: 5,
      image_url: '',
      location: '',
      default_unit_cost: null,
      compatibleEquipmentIds: [],
      managerIds: [],
      compatibilityRules: []
    }
  });

  // Load editing data
  useEffect(() => {
    if (open && editingItem) {
      // Reset loading/error state - async data will be loaded separately
      setIsEditingDataLoaded(false);
      setEditingDataLoadError(false);
      form.reset({
        name: editingItem.name,
        description: editingItem.description || '',
        sku: editingItem.sku || '',
        external_id: editingItem.external_id || '',
        quantity_on_hand: editingItem.quantity_on_hand,
        low_stock_threshold: editingItem.low_stock_threshold,
        image_url: editingItem.image_url || '',
        location: editingItem.location || '',
        default_unit_cost: editingItem.default_unit_cost ? Number(editingItem.default_unit_cost) : null,
        compatibleEquipmentIds: [], // Will be loaded separately
        managerIds: [], // Will be loaded separately
        compatibilityRules: [] // Will be loaded separately
      });
    } else if (open && !editingItem) {
      // Creating new item - no async data to load
      setIsEditingDataLoaded(true);
      setEditingDataLoadError(false);
      form.reset({
        name: '',
        description: '',
        sku: '',
        external_id: '',
        quantity_on_hand: 0,
        low_stock_threshold: 5,
        image_url: '',
        location: '',
        default_unit_cost: null,
        compatibleEquipmentIds: [],
        managerIds: [],
        compatibilityRules: []
      });
    }
  }, [open, editingItem, form]);

  // Load compatible equipment, managers, and compatibility rules when editing.
  // Uses AbortController to properly cancel in-flight requests on unmount/re-render,
  // plus a ref to track the current item ID for additional race condition prevention.
  useEffect(() => {
    // Create AbortController for this effect instance
    const abortController = new AbortController();
    
    if (editingItem && currentOrganization?.id) {
      // Track which item we're loading data for
      const itemId = editingItem.id;
      currentEditingItemIdRef.current = itemId;

      const loadEditingData = async () => {
        try {
          // SECURITY: Verify item belongs to organization (failsafe even with RLS)
          if (editingItem.organization_id !== currentOrganization.id) {
            logger.error('Security: editingItem organization mismatch', {
              itemOrgId: editingItem.organization_id,
              currentOrgId: currentOrganization.id
            });
            // Throw to trigger catch block and prevent form submission with empty related data
            throw new Error('Security: editingItem organization mismatch');
          }

          // Check for abort before each async operation
          if (abortController.signal.aborted) return;

          // Load compatible equipment IDs
          // Filter via join to inventory_items for organization isolation
          const { data: compatibilityData } = await supabase
            .from('equipment_part_compatibility')
            .select(`
              equipment_id,
              inventory_items!inner(organization_id)
            `)
            .eq('inventory_item_id', editingItem.id)
            .eq('inventory_items.organization_id', currentOrganization.id);
          
          // Check for abort and stale item ID after async operation
          if (abortController.signal.aborted || currentEditingItemIdRef.current !== itemId) {
            logger.debug('Ignoring stale/aborted editing data load for item:', itemId);
            return;
          }

          const equipmentIds = (compatibilityData || []).map(row => row.equipment_id);
          
          // Load manager IDs
          // Filter via join to inventory_items for organization isolation
          const { data: managersData } = await supabase
            .from('inventory_item_managers')
            .select(`
              user_id,
              inventory_items!inner(organization_id)
            `)
            .eq('inventory_item_id', editingItem.id)
            .eq('inventory_items.organization_id', currentOrganization.id);
          
          // Check again after second async operation
          if (abortController.signal.aborted || currentEditingItemIdRef.current !== itemId) {
            logger.debug('Ignoring stale/aborted editing data load for item:', itemId);
            return;
          }

          const managerIds = (managersData || []).map(row => row.user_id);

          // Load compatibility rules
          // Filter via join to inventory_items for organization isolation
          const { data: rulesData } = await supabase
            .from('part_compatibility_rules')
            .select(`
              manufacturer,
              model,
              inventory_items!inner(organization_id)
            `)
            .eq('inventory_item_id', editingItem.id)
            .eq('inventory_items.organization_id', currentOrganization.id);

          // Final check before updating form state
          if (abortController.signal.aborted || currentEditingItemIdRef.current !== itemId) {
            logger.debug('Ignoring stale/aborted editing data load for item:', itemId);
            return;
          }

          const rules: PartCompatibilityRuleFormData[] = (rulesData || []).map(row => ({
            manufacturer: row.manufacturer,
            model: row.model
          }));
          
          // Update form with loaded data
          form.setValue('compatibleEquipmentIds', equipmentIds);
          form.setValue('managerIds', managerIds);
          form.setValue('compatibilityRules', rules);
          
          // Mark async data as loaded - form can now be safely submitted
          setIsEditingDataLoaded(true);
        } catch (error) {
          // Ignore errors from aborted/stale requests
          if (abortController.signal.aborted || currentEditingItemIdRef.current !== itemId) {
            return;
          }
          logger.error('Error loading editing data:', error);
          // Mark as error - do NOT unblock form to prevent data loss
          // Empty arrays would overwrite existing rules/equipment/managers
          setEditingDataLoadError(true);
          toast({
            title: 'Failed to load item data',
            description: 'Could not load compatibility rules and settings. Please close and try again.',
            variant: 'error'
          });
        }
      };
      
      loadEditingData();
    }

    // Cleanup: abort pending requests and clear ref when effect re-runs or unmounts
    return () => {
      abortController.abort();
      currentEditingItemIdRef.current = null;
    };
  }, [editingItem, currentOrganization?.id, form, toast]);

  const onSubmit = async (data: InventoryItemFormData) => {
    if (!currentOrganization) {
      return;
    }

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          organizationId: currentOrganization.id,
          itemId: editingItem.id,
          formData: data
        });
      } else {
        await createMutation.mutateAsync({
          organizationId: currentOrganization.id,
          formData: data
        });
      }
      onClose();
    } catch (error) {
      logger.error('Error submitting inventory item form:', { error, editingItem: !!editingItem });
      // Error handling is done in the mutation hooks
    }
  };

  const selectedEquipmentIds = form.watch('compatibleEquipmentIds') || [];
  const selectedManagerIds = form.watch('managerIds') || [];
  

  const filteredEquipment = allEquipment.filter(eq =>
    eq.name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
    eq.manufacturer?.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
    eq.model?.toLowerCase().includes(equipmentSearch.toLowerCase())
  );

  const filteredMembers = members.filter(member =>
    member.name?.toLowerCase().includes(managerSearch.toLowerCase()) ||
    member.email?.toLowerCase().includes(managerSearch.toLowerCase())
  );

  const handleEquipmentToggle = (equipmentId: string, checked: boolean) => {
    const current = form.getValues('compatibleEquipmentIds') || [];
    if (checked) {
      form.setValue('compatibleEquipmentIds', [...current, equipmentId]);
    } else {
      form.setValue('compatibleEquipmentIds', current.filter(id => id !== equipmentId));
    }
  };

  const handleManagerToggle = (userId: string, checked: boolean) => {
    const current = form.getValues('managerIds') || [];
    if (checked) {
      form.setValue('managerIds', [...current, userId]);
    } else {
      form.setValue('managerIds', current.filter(id => id !== userId));
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;
  // Loading state: either a mutation is in progress or async editing data is still loading
  const isEditingDataPending = !!editingItem && !isEditingDataLoaded;
  // Form should be disabled while mutating, while async editing data is loading, or if loading failed
  const isFormDisabled = isMutating || isEditingDataPending || editingDataLoadError;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Item name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="Internal SKU" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription>Internal identifier (unique per organization)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Item description"
                      {...field}
                      value={field.value || ''}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="external_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>External ID (UPC/EAN/Barcode)</FormLabel>
                    <FormControl>
                      <Input placeholder="Manufacturer barcode" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription>For scanning manufacturer barcodes</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Shelf A, Bin 5" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Quantity & Stock */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="quantity_on_hand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity on Hand *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            field.onChange(0);
                          } else {
                            const numValue = parseInt(value, 10);
                            field.onChange(isNaN(numValue) ? 0 : numValue);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="low_stock_threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Low Stock Threshold</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_unit_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Unit Cost ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormDescription>For form auto-fill only</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Compatibility Rules (manufacturer/model patterns) */}
            <FormField
              control={form.control}
              name="compatibilityRules"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <CompatibilityRulesEditor
                      rules={field.value || []}
                      onChange={field.onChange}
                      disabled={isFormDisabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Compatible Equipment (direct links) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Forklift className="h-4 w-4" />
                  Compatible Equipment (Direct Links)
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Link specific equipment directly. Use rules above for pattern-based matching.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search equipment..."
                    value={equipmentSearch}
                    onChange={(e) => setEquipmentSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
                  {filteredEquipment.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No equipment found
                    </p>
                  ) : (
                    filteredEquipment.map((equipment) => {
                      const isSelected = selectedEquipmentIds.includes(equipment.id);
                      return (
                        <div
                          key={equipment.id}
                          className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleEquipmentToggle(equipment.id, checked as boolean)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{equipment.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {equipment.manufacturer} {equipment.model}
                            </div>
                          </div>
                          {isSelected && (
                            <Badge variant="secondary" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                            </Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                {selectedEquipmentIds.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedEquipmentIds.map((id) => {
                      const equipment = allEquipment.find(eq => eq.id === id);
                      return equipment ? (
                        <Badge key={id} variant="secondary" className="gap-1">
                          {equipment.name}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => handleEquipmentToggle(id, false)}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Managers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Managers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search members..."
                    value={managerSearch}
                    onChange={(e) => setManagerSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
                  {filteredMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No members found
                    </p>
                  ) : (
                    filteredMembers.map((member) => {
                      const isSelected = selectedManagerIds.includes(member.id);
                      return (
                        <div
                          key={member.id}
                          className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleManagerToggle(member.id, checked as boolean)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{member.name || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">{member.email}</div>
                          </div>
                          {isSelected && (
                            <Badge variant="secondary" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                            </Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                {selectedManagerIds.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedManagerIds.map((id) => {
                      const member = members.find(m => m.id === id);
                      return member ? (
                        <Badge key={id} variant="secondary" className="gap-1">
                          {member.name || member.email}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => handleManagerToggle(id, false)}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end space-x-2">
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

