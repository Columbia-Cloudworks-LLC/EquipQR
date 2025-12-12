import React, { useState, useEffect } from 'react';
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
import { Search, Package, Users, Check, X } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCreateInventoryItem, useUpdateInventoryItem } from '@/hooks/useInventory';
import { useEquipment } from '@/hooks/useEquipment';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { supabase } from '@/integrations/supabase/client';
import { inventoryItemFormSchema, type InventoryItemFormData } from '@/schemas/inventorySchema';
import type { InventoryItem } from '@/types/inventory';

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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/a65f405d-0706-4f0e-be3a-35b48c38930e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryItemForm.tsx:45',message:'Form component rendered',data:{open,editingItemId:editingItem?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  const { currentOrganization } = useOrganization();
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [managerSearch, setManagerSearch] = useState('');

  const createMutation = useCreateInventoryItem();
  const updateMutation = useUpdateInventoryItem();

  const { data: allEquipment = [] } = useEquipment(currentOrganization?.id);
  const { data: members = [] } = useOrganizationMembers(currentOrganization?.id);

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
      managerIds: []
    }
  });

  // Load editing data
  useEffect(() => {
    console.log('[DEBUG] Form reset useEffect triggered', { open, editingItem: editingItem?.id, currentName: form.getValues('name') });
    if (open && editingItem) {
      // #region agent log
      console.log('[DEBUG] Resetting form for editing');
      fetch('http://127.0.0.1:7242/ingest/a65f405d-0706-4f0e-be3a-35b48c38930e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryItemForm.tsx:77',message:'Resetting form for editing',data:{editingItemName:editingItem.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
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
        managerIds: [] // Will be loaded separately
      });
    } else if (open && !editingItem) {
      // #region agent log
      const beforeReset = form.getValues('name');
      console.log('[DEBUG] Resetting form for create, name before reset:', beforeReset);
      fetch('http://127.0.0.1:7242/ingest/a65f405d-0706-4f0e-be3a-35b48c38930e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryItemForm.tsx:92',message:'Resetting form for create',data:{nameBeforeReset:beforeReset},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
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
        managerIds: []
      });
      console.log('[DEBUG] After reset, name value:', form.getValues('name'));
    }
  }, [open, editingItem, form]);

  // Load compatible equipment and managers when editing
  useEffect(() => {
    if (editingItem && currentOrganization?.id) {
      const loadEditingData = async () => {
        try {
          // Load compatible equipment IDs
          const { data: compatibilityData } = await supabase
            .from('equipment_part_compatibility')
            .select('equipment_id')
            .eq('inventory_item_id', editingItem.id);
          
          const equipmentIds = (compatibilityData || []).map(row => row.equipment_id);
          
          // Load manager IDs
          const { data: managersData } = await supabase
            .from('inventory_item_managers')
            .select('user_id')
            .eq('inventory_item_id', editingItem.id);
          
          const managerIds = (managersData || []).map(row => row.user_id);
          
          // Update form with loaded data
          form.setValue('compatibleEquipmentIds', equipmentIds);
          form.setValue('managerIds', managerIds);
        } catch (error) {
          console.error('Error loading editing data:', error);
        }
      };
      
      loadEditingData();
    }
  }, [editingItem, currentOrganization?.id, form]);

  const onSubmit = async (data: InventoryItemFormData) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a65f405d-0706-4f0e-be3a-35b48c38930e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryItemForm.tsx:142',message:'onSubmit called',data:{name:data.name,quantity_on_hand:data.quantity_on_hand,currentOrganizationId:currentOrganization?.id,editingItemId:editingItem?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    if (!currentOrganization) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a65f405d-0706-4f0e-be3a-35b48c38930e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryItemForm.tsx:145',message:'No currentOrganization - early return',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      return;
    }

    try {
      if (editingItem) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/a65f405d-0706-4f0e-be3a-35b48c38930e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryItemForm.tsx:152',message:'Calling updateMutation',data:{organizationId:currentOrganization.id,itemId:editingItem.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        await updateMutation.mutateAsync({
          organizationId: currentOrganization.id,
          itemId: editingItem.id,
          formData: data
        });
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/a65f405d-0706-4f0e-be3a-35b48c38930e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryItemForm.tsx:160',message:'Calling createMutation',data:{organizationId:currentOrganization.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        await createMutation.mutateAsync({
          organizationId: currentOrganization.id,
          formData: data
        });
      }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a65f405d-0706-4f0e-be3a-35b48c38930e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryItemForm.tsx:168',message:'Mutation successful, calling onClose',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      onClose();
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a65f405d-0706-4f0e-be3a-35b48c38930e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryItemForm.tsx:172',message:'Error in onSubmit catch block',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      // Error handling is done in the mutation hooks
      console.error('Error submitting form:', error);
    }
  };

  const selectedEquipmentIds = form.watch('compatibleEquipmentIds') || [];
  const selectedManagerIds = form.watch('managerIds') || [];
  
  // Watch name field for debugging
  const watchedName = form.watch('name');
  // #region agent log
  React.useEffect(() => {
    console.log('[DEBUG] Name field value changed:', watchedName);
    fetch('http://127.0.0.1:7242/ingest/a65f405d-0706-4f0e-be3a-35b48c38930e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryItemForm.tsx:165',message:'Name field value changed',data:{watchedName,formNameValue:form.getValues('name')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  }, [watchedName, form]);
  // #endregion

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

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/a65f405d-0706-4f0e-be3a-35b48c38930e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryItemForm.tsx:197',message:'Rendering Dialog',data:{open,currentOrganizationId:currentOrganization?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
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
          <form onSubmit={(e) => {
            const formValues = form.getValues();
            const formErrors = form.formState.errors;
            const nameValue = form.getValues('name');
            // #region agent log
            console.log('[DEBUG] Form submit - formValues:', formValues, 'nameValue:', nameValue, 'errors:', formErrors);
            fetch('http://127.0.0.1:7242/ingest/a65f405d-0706-4f0e-be3a-35b48c38930e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InventoryItemForm.tsx:217',message:'Form submit event triggered',data:{formValues,formErrors,nameValue},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            form.handleSubmit(onSubmit)(e);
          }} className="space-y-6">
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

            {/* Compatible Equipment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Compatible Equipment
                </CardTitle>
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
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? 'Saving...'
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

