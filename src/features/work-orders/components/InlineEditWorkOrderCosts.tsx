import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit2, Check, X, DollarSign, Package } from 'lucide-react';
import { WorkOrderCost } from '@/features/work-orders/services/workOrderCostsService';
import { useWorkOrderCostsState } from '@/features/work-orders/hooks/useWorkOrderCostsState';
import { 
  useCreateWorkOrderCost, 
  useUpdateWorkOrderCostWithInventory, 
  useDeleteWorkOrderCostWithInventoryRestore 
} from '@/features/work-orders/hooks/useWorkOrderCosts';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { useAdjustInventoryQuantity } from '@/features/inventory/hooks/useInventory';
import { supabase } from '@/integrations/supabase/client';
import { InventoryPartSelector } from './InventoryPartSelector';
import WorkOrderCostsEditor from './WorkOrderCostsEditor';
import { useAppToast } from '@/hooks/useAppToast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface InlineEditWorkOrderCostsProps {
  costs: WorkOrderCost[];
  workOrderId: string;
  equipmentIds: string[];
  canEdit: boolean;
}

const InlineEditWorkOrderCosts: React.FC<InlineEditWorkOrderCostsProps> = ({
  costs,
  workOrderId,
  equipmentIds,
  canEdit
}) => {
  const isMobile = useIsMobile();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const { toast } = useAppToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showInventorySelector, setShowInventorySelector] = useState(false);
  
  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [costToDelete, setCostToDelete] = useState<{ id: string; hasInventory: boolean; quantity: number } | null>(null);
  
  const adjustInventoryMutation = useAdjustInventoryQuantity();
  
  const {
    costs: editCosts,
    addCost,
    addFilledCost,
    removeCost,
    updateCost,
    getNewCosts,
    getUpdatedCosts,
    getDeletedCosts,
    getInventoryInfo,
    validateCosts,
    resetCosts,
    ensureMinimumCosts
  } = useWorkOrderCostsState(costs);

  const createCostMutation = useCreateWorkOrderCost();
  const updateCostWithInventoryMutation = useUpdateWorkOrderCostWithInventory();
  const deleteCostWithInventoryMutation = useDeleteWorkOrderCostWithInventoryRestore();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(cents / 100);
  };

  const calculateSubtotal = () => {
    return costs.reduce((sum, cost) => sum + cost.total_price_cents, 0);
  };

  const handleStartEdit = () => {
    resetCosts(costs);
    ensureMinimumCosts();
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!validateCosts() || !currentOrganization) {
      return;
    }

    setIsSaving(true);
    try {
      // Handle new costs (manually added, not from inventory)
      const newCosts = getNewCosts();
      for (const cost of newCosts) {
        await createCostMutation.mutateAsync({
          work_order_id: workOrderId,
          description: cost.description,
          quantity: cost.quantity,
          unit_price_cents: cost.unit_price_cents
        });
      }

      // Handle updated costs - use inventory-aware mutation for quantity changes
      const updatedCosts = getUpdatedCosts();
      for (const cost of updatedCosts) {
        const originalCost = costs.find(c => c.id === cost.id);
        if (originalCost && (
          originalCost.description !== cost.description ||
          originalCost.quantity !== cost.quantity ||
          originalCost.unit_price_cents !== cost.unit_price_cents
        )) {
          // Use inventory-aware update if this cost has an inventory source
          await updateCostWithInventoryMutation.mutateAsync({
            costId: cost.id,
            updateData: {
              description: cost.description,
              quantity: cost.quantity,
              unit_price_cents: cost.unit_price_cents
            },
            organizationId: currentOrganization.id
          });
        }
      }

      // Handle deleted costs - use inventory-aware delete
      const deletedCosts = getDeletedCosts();
      for (const cost of deletedCosts) {
        await deleteCostWithInventoryMutation.mutateAsync({
          costId: cost.id,
          organizationId: currentOrganization.id
        });
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Error saving costs:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    resetCosts(costs);
    setIsEditing(false);
  };

  const handleAddFromInventory = async (itemId: string, quantity: number, unitCost: number) => {
    if (!currentOrganization || !user) return;

    try {
      // Fetch current item for display purposes (name, etc.)
      // Note: Stock validation happens in the RPC function with row locking
      // to prevent race conditions and overselling
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
          variant: 'destructive'
        });
        return;
      }

      // Client-side UX check: warn if stock appears insufficient
      // The RPC function will enforce this with row locking to prevent race conditions
      if (currentItem.quantity_on_hand < quantity) {
        toast({
          title: 'Insufficient stock',
          description: `Available: ${currentItem.quantity_on_hand}, Requested: ${quantity}. The request will be rejected if stock is insufficient.`,
          variant: 'warning'
        });
      }

      // Adjust inventory quantity (decrease by quantity used)
      // RPC function uses FOR UPDATE row locking and validates stock levels
      // to prevent race conditions and overselling
      const newQuantity = await adjustInventoryMutation.mutateAsync({
        organizationId: currentOrganization.id,
        adjustment: {
          itemId,
          delta: -quantity,
          reason: `Used in work order ${workOrderId}`,
          workOrderId
        }
      });

      // Only create work order cost if inventory adjustment succeeded
      // Use the name we already fetched, or fallback to querying again
      const itemName = currentItem.name || `Inventory item (ID: ${itemId.substring(0, 8)}...)`;
      const unitPriceCents = Math.round(unitCost * 100);

      const createdCost = await createCostMutation.mutateAsync({
        work_order_id: workOrderId,
        description: itemName,
        quantity: quantity,
        unit_price_cents: unitPriceCents,
        // Track the source inventory item for restoration on delete/edit
        inventory_item_id: itemId,
        original_quantity: quantity
      });

      // Update local editing state so user sees the new cost immediately
      // (the mutation invalidates the query, but we're in edit mode showing local state)
      if (isEditing) {
        addFilledCost({
          id: createdCost.id,
          work_order_id: workOrderId,
          description: itemName,
          quantity: quantity,
          unit_price_cents: unitPriceCents,
          inventory_item_id: itemId,
          original_quantity: quantity
        });
      }

      toast({
        title: 'Part added',
        description: `Added ${quantity} unit(s) from inventory to work order. Remaining stock: ${newQuantity}`
      });
    } catch (error) {
      // Error handling: The mutation hook's onError will show a generic toast,
      // but we provide additional context here for insufficient stock errors
      console.error('Error adding part from inventory:', error);
      
      // Extract error message from Supabase RPC error
      // Supabase RPC errors have the message in error.message or error.details
      let errorMessage = '';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      } else if (error && typeof error === 'object' && 'details' in error) {
        errorMessage = String(error.details);
      } else {
        errorMessage = String(error);
      }
      
      // Check if it's an insufficient stock error from the RPC function
      // The RPC function raises: 'Insufficient stock: requested X units, but only Y available'
      if (errorMessage.includes('Insufficient stock')) {
        // Extract the specific details from the error message if available
        const match = errorMessage.match(/Insufficient stock: requested (\d+) units, but only (\d+) available/);
        if (match) {
          toast({
            title: 'Cannot add part',
            description: `Insufficient stock: Only ${match[2]} unit(s) available, but ${match[1]} requested. The quantity may have changed since you selected this item.`,
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Cannot add part',
            description: 'Insufficient stock available. The quantity may have changed since you selected this item.',
            variant: 'destructive'
          });
        }
      }
      // Other errors are handled by the mutation hook's onError callback
      // The work order cost will NOT be created because we're in the catch block
    }
  };

  const MobileCostDisplay = ({ cost }: { cost: WorkOrderCost }) => (
    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium text-sm flex items-center gap-1.5">
            {cost.inventory_item_id && (
              <Package className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" title="From inventory" />
            )}
            {cost.description}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Added by {cost.created_by_name} • {new Date(cost.created_at).toLocaleDateString()}
            {cost.inventory_item_id && <span className="ml-1 text-blue-500">(Inventory)</span>}
          </div>
        </div>
        <div className="text-right ml-2">
          <div className="font-semibold text-lg">
            {formatCurrency(cost.total_price_cents)}
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
        <div>Qty: {cost.quantity}</div>
        <div>Unit: {formatCurrency(cost.unit_price_cents)}</div>
      </div>
    </div>
  );

  const DesktopCostDisplay = ({ cost }: { cost: WorkOrderCost }) => (
    <div className="p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
      <div className="grid grid-cols-4 gap-4 items-center">
        <div>
          <div className="font-medium flex items-center gap-1.5">
            {cost.inventory_item_id && (
              <Package className="h-4 w-4 text-blue-500 flex-shrink-0" title="From inventory" />
            )}
            {cost.description}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Added by {cost.created_by_name} on{' '}
            {new Date(cost.created_at).toLocaleDateString()}
            {cost.inventory_item_id && <span className="ml-1 text-blue-500">(Inventory)</span>}
          </div>
        </div>
        <div className="text-sm">{cost.quantity}</div>
        <div className="text-sm">{formatCurrency(cost.unit_price_cents)}</div>
        <div className="font-semibold text-right">
          {formatCurrency(cost.total_price_cents)}
        </div>
      </div>
    </div>
  );

  // Handle delete with confirmation for inventory-sourced costs
  const handleRemoveCost = (id: string) => {
    const inventoryInfo = getInventoryInfo(id);
    if (inventoryInfo) {
      // Show confirmation dialog for inventory-sourced costs
      setCostToDelete({
        id,
        hasInventory: true,
        quantity: inventoryInfo.quantity
      });
      setDeleteConfirmOpen(true);
    } else {
      // Directly remove non-inventory costs
      removeCost(id);
    }
  };

  const confirmDelete = () => {
    if (costToDelete) {
      removeCost(costToDelete.id);
      setCostToDelete(null);
    }
    setDeleteConfirmOpen(false);
  };

  if (!canEdit && costs.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No costs recorded</p>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="space-y-4">
        {costs.length > 0 && (
          <>
            {/* Desktop Headers */}
            {!isMobile && (
              <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground px-3">
                <div>Description</div>
                <div>Quantity</div>
                <div>Unit Price</div>
                <div className="text-right">Total</div>
              </div>
            )}

            {/* Cost Items */}
            <div className="space-y-3">
              {costs.map((cost) => (
                <div key={cost.id}>
                  {isMobile ? (
                    <MobileCostDisplay cost={cost} />
                  ) : (
                    <DesktopCostDisplay cost={cost} />
                  )}
                </div>
              ))}
            </div>

            {/* Subtotal */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Subtotal:</span>
                <span>{formatCurrency(calculateSubtotal())}</span>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className="group">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium">Cost Items</h4>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleStartEdit}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>
        
        {costs.length > 0 ? (
          <div className="space-y-4">
            {/* Desktop Headers */}
            {!isMobile && (
              <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground px-3">
                <div>Description</div>
                <div>Quantity</div>
                <div>Unit Price</div>
                <div className="text-right">Total</div>
              </div>
            )}

            {/* Cost Items */}
            <div className="space-y-3">
              {costs.map((cost) => (
                <div key={cost.id}>
                  {isMobile ? (
                    <MobileCostDisplay cost={cost} />
                  ) : (
                    <DesktopCostDisplay cost={cost} />
                  )}
                </div>
              ))}
            </div>

            {/* Subtotal */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Subtotal:</span>
                <span>{formatCurrency(calculateSubtotal())}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No costs recorded</p>
            <p className="text-sm">Click the edit button to add cost items</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium">Edit Cost Items</h4>
        <div className="flex gap-2">
          {equipmentIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInventorySelector(true)}
              disabled={isSaving}
            >
              <Package className="h-4 w-4 mr-1" />
              Add from Inventory
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !validateCosts()}
          >
            <Check className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
      
      <WorkOrderCostsEditor
        costs={editCosts}
        onAddCost={addCost}
        onRemoveCost={handleRemoveCost}
        onUpdateCost={updateCost}
        hasError={!validateCosts()}
      />

      {/* Inventory Part Selector */}
      {showInventorySelector && equipmentIds.length > 0 && (
        <InventoryPartSelector
          open={showInventorySelector}
          onClose={() => setShowInventorySelector(false)}
          equipmentIds={equipmentIds}
          onSelect={handleAddFromInventory}
        />
      )}

      {/* Delete Confirmation Dialog for Inventory-Sourced Costs */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Inventory?</AlertDialogTitle>
            <AlertDialogDescription>
              This cost item was added from inventory. Deleting it will restore{' '}
              <strong>{costToDelete?.quantity ?? 0} unit(s)</strong> back to the inventory.
              <br /><br />
              Are you sure you want to delete this cost and restore the inventory?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCostToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete & Restore Inventory
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InlineEditWorkOrderCosts;
