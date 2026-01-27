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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Forklift, Check, X, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCreateInventoryItem, useUpdateInventoryItem } from '@/features/inventory/hooks/useInventory';
import { useEquipment } from '@/features/equipment/hooks/useEquipment';
import {
  useAlternateGroups,
  useCreateAlternateGroup,
  useAddInventoryItemToGroup,
} from '@/features/inventory/hooks/useAlternateGroups';
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
  // Track whether async editing data (compatibility rules, equipment links) has loaded
  const [isEditingDataLoaded, setIsEditingDataLoaded] = useState(false);
  // Track if loading failed - prevents form submission with stale/empty data
  const [editingDataLoadError, setEditingDataLoadError] = useState(false);
  // Ref to track current item ID to prevent race conditions when rapidly opening/closing form
  const currentEditingItemIdRef = useRef<string | null>(null);
  // Collapsible state for direct equipment links (collapsed by default to encourage rules-based approach)
  const [directLinksOpen, setDirectLinksOpen] = useState(false);
  // Collapsible state for alternate groups section
  const [alternateGroupOpen, setAlternateGroupOpen] = useState(false);

  const createMutation = useCreateInventoryItem();
  const updateMutation = useUpdateInventoryItem();
  const createAlternateGroupMutation = useCreateAlternateGroup();
  const addToGroupMutation = useAddInventoryItemToGroup();

  const { data: allEquipment = [] } = useEquipment(currentOrganization?.id);
  const { data: alternateGroups = [] } = useAlternateGroups(currentOrganization?.id);

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
      compatibilityRules: [],
      alternateGroupMode: 'none',
      alternateGroupId: null,
      newAlternateGroupName: null
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
        compatibilityRules: [], // Will be loaded separately
        alternateGroupMode: 'none',
        alternateGroupId: null,
        newAlternateGroupName: null
      });
      // Reset collapsible states when editing
      setDirectLinksOpen(false);
      setAlternateGroupOpen(false);
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
        compatibilityRules: [],
        alternateGroupMode: 'none',
        alternateGroupId: null,
        newAlternateGroupName: null
      });
      // Reset collapsible states for new items
      setDirectLinksOpen(false);
      setAlternateGroupOpen(false);
    }
  }, [open, editingItem, form]);

  // Load compatible equipment and compatibility rules when editing.
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
          form.setValue('compatibilityRules', rules);
          
          // Final abort check before setState to prevent React warnings about
          // updating state on unmounted components
          if (!abortController.signal.aborted) {
            // Mark async data as loaded - form can now be safely submitted
            setIsEditingDataLoaded(true);
          }
        } catch (error) {
          // Ignore errors from aborted/stale requests - check signal BEFORE any setState
          // to prevent memory leaks and React warnings about updating unmounted components
          if (abortController.signal.aborted || currentEditingItemIdRef.current !== itemId) {
            return;
          }
          logger.error('Error loading editing data:', error);
          // Mark as error - do NOT unblock form to prevent data loss
          // Empty arrays would overwrite existing rules/equipment
          // Double-check abort signal before setState to handle race with unmount
          if (!abortController.signal.aborted) {
            setEditingDataLoadError(true);
            toast({
              title: 'Failed to load item data',
              description: 'Could not load compatibility rules and settings. Please close and try again.',
              variant: 'error'
            });
          }
        }
      };
      
      loadEditingData();
    }

    // Cleanup: abort pending requests when effect re-runs or component unmounts.
    // Note: We only abort the controller - the ref is left as-is since each effect instance
    // captures its own `itemId` variable. The AbortController pattern ensures proper cancellation
    // regardless of ref state, and leaving the ref set allows subsequent effects for the same
    // item to proceed without interference from cleanup timing.
    return () => {
      abortController.abort();
    };
  }, [editingItem, currentOrganization?.id, form, toast]);

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
          formData: data
        });
        createdItemId = editingItem.id;
      } else {
        const createdItem = await createMutation.mutateAsync({
          organizationId: currentOrganization.id,
          formData: data
        });
        createdItemId = createdItem.id;
      }

      // Handle alternate group assignment (only for new items or if explicitly requested)
      if (createdItemId && data.alternateGroupMode !== 'none' && !editingItem) {
        try {
          let targetGroupId = data.alternateGroupId;

          // Create new group if requested
          if (data.alternateGroupMode === 'new' && data.newAlternateGroupName) {
            const newGroup = await createAlternateGroupMutation.mutateAsync({
              organizationId: currentOrganization.id,
              data: {
                name: data.newAlternateGroupName,
                status: 'unverified'
              }
            });
            targetGroupId = newGroup.id;
          }

          // Add item to the group
          if (targetGroupId) {
            await addToGroupMutation.mutateAsync({
              organizationId: currentOrganization.id,
              groupId: targetGroupId,
              inventoryItemId: createdItemId,
              isPrimary: false
            });
          }
        } catch (groupError) {
          // Log but don't fail the whole operation - item was created successfully
          logger.error('Error adding item to alternate group:', { error: groupError });
          toast({
            title: 'Item created',
            description: 'The item was created but could not be added to the alternate group.',
            variant: 'warning'
          });
        }
      }

      onClose();
    } catch (error) {
      logger.error('Error submitting inventory item form:', { error, editingItem: !!editingItem });
      // Error handling is done in the mutation hooks
    }
  };

  const selectedEquipmentIds = form.watch('compatibleEquipmentIds') || [];

  const filteredEquipment = allEquipment.filter(eq =>
    eq.name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
    eq.manufacturer?.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
    eq.model?.toLowerCase().includes(equipmentSearch.toLowerCase())
  );

  const handleEquipmentToggle = (equipmentId: string, checked: boolean) => {
    const current = form.getValues('compatibleEquipmentIds') || [];
    if (checked) {
      form.setValue('compatibleEquipmentIds', [...current, equipmentId]);
    } else {
      form.setValue('compatibleEquipmentIds', current.filter(id => id !== equipmentId));
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending || 
    createAlternateGroupMutation.isPending || addToGroupMutation.isPending;
  // Loading state: either a mutation is in progress or async editing data is still loading
  const isEditingDataPending = !!editingItem && !isEditingDataLoaded;
  // Form should be disabled while mutating, while async editing data is loading, or if loading failed
  const isFormDisabled = isMutating || isEditingDataPending || editingDataLoadError;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
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

            {/* Compatible Equipment (direct links) - Collapsible to encourage rules-based approach */}
            <Collapsible open={directLinksOpen} onOpenChange={setDirectLinksOpen}>
              <Card>
                <CardHeader className="pb-3">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-between w-full text-left hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors"
                    >
                      <CardTitle className="text-base flex items-center gap-2">
                        <Forklift className="h-4 w-4" />
                        Compatible Equipment (Direct Links)
                        {selectedEquipmentIds.length > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {selectedEquipmentIds.length} selected
                          </Badge>
                        )}
                      </CardTitle>
                      {directLinksOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <p className="text-sm text-muted-foreground mt-1">
                    Link specific equipment directly. <em className="text-primary">Prefer compatibility rules above for pattern-based matching.</em>
                  </p>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
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
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Alternate Parts Group (optional) - Only show for new items */}
            {!editingItem && (
              <Collapsible open={alternateGroupOpen} onOpenChange={setAlternateGroupOpen}>
                <Card>
                  <CardHeader className="pb-3">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center justify-between w-full text-left hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors"
                      >
                        <CardTitle className="text-base flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          Alternate Parts Group
                          <Badge variant="outline" className="ml-2 font-normal">
                            Optional
                          </Badge>
                        </CardTitle>
                        {alternateGroupOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add this part to a group of interchangeable parts for cross-reference lookups.
                    </p>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-4 pt-0">
                      <FormField
                        control={form.control}
                        name="alternateGroupMode"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <RadioGroup
                                value={field.value}
                                onValueChange={field.onChange}
                                className="space-y-2"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="none" id="alt-none" />
                                  <Label htmlFor="alt-none" className="font-normal cursor-pointer">
                                    Don't add to a group
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="existing" id="alt-existing" />
                                  <Label htmlFor="alt-existing" className="font-normal cursor-pointer">
                                    Add to existing group
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="new" id="alt-new" />
                                  <Label htmlFor="alt-new" className="font-normal cursor-pointer">
                                    Create new group
                                  </Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Existing group selector */}
                      {form.watch('alternateGroupMode') === 'existing' && (
                        <FormField
                          control={form.control}
                          name="alternateGroupId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select Group</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value || ''}
                                  onValueChange={field.onChange}
                                  disabled={isFormDisabled}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose an alternate group..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {alternateGroups.length === 0 ? (
                                      <SelectItem value="" disabled>
                                        No groups available
                                      </SelectItem>
                                    ) : (
                                      alternateGroups.map((group) => (
                                        <SelectItem key={group.id} value={group.id}>
                                          <div className="flex items-center gap-2">
                                            <span>{group.name}</span>
                                            {group.status === 'verified' && (
                                              <Badge variant="secondary" className="text-xs">
                                                <Check className="h-3 w-3 mr-1" />
                                                Verified
                                              </Badge>
                                            )}
                                          </div>
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* New group name input */}
                      {form.watch('alternateGroupMode') === 'new' && (
                        <FormField
                          control={form.control}
                          name="newAlternateGroupName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Group Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., Oil Filter - CAT D6T Compatible"
                                  {...field}
                                  value={field.value || ''}
                                  disabled={isFormDisabled}
                                />
                              </FormControl>
                              <FormDescription>
                                A descriptive name for this group of interchangeable parts.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

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

