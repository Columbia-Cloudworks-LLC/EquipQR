import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit2, Check, X, DollarSign, Package } from 'lucide-react';
import { WorkOrderCost } from '@/services/workOrderCostsService';
import { useWorkOrderCostsState } from '@/hooks/useWorkOrderCostsState';
import { 
  useCreateWorkOrderCost, 
  useUpdateWorkOrderCost, 
  useDeleteWorkOrderCost 
} from '@/hooks/useWorkOrderCosts';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';
import { useAdjustInventoryQuantity } from '@/hooks/useInventory';
import { supabase } from '@/integrations/supabase/client';
import { InventoryPartSelector } from './InventoryPartSelector';
import WorkOrderCostsEditor from './WorkOrderCostsEditor';
import { useAppToast } from '@/hooks/useAppToast';

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
  
  const adjustInventoryMutation = useAdjustInventoryQuantity();
  
  const {
    costs: editCosts,
    addCost,
    removeCost,
    updateCost,
    getNewCosts,
    getUpdatedCosts,
    getDeletedCosts,
    validateCosts,
    resetCosts,
    ensureMinimumCosts
  } = useWorkOrderCostsState(costs);

  const createCostMutation = useCreateWorkOrderCost();
  const updateCostMutation = useUpdateWorkOrderCost();
  const deleteCostMutation = useDeleteWorkOrderCost();

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
    if (!validateCosts()) {
      return;
    }

    setIsSaving(true);
    try {
      // Handle new costs
      const newCosts = getNewCosts();
      for (const cost of newCosts) {
        await createCostMutation.mutateAsync({
          work_order_id: workOrderId,
          description: cost.description,
          quantity: cost.quantity,
          unit_price_cents: cost.unit_price_cents
        });
      }

      // Handle updated costs
      const updatedCosts = getUpdatedCosts();
      for (const cost of updatedCosts) {
        const originalCost = costs.find(c => c.id === cost.id);
        if (originalCost && (
          originalCost.description !== cost.description ||
          originalCost.quantity !== cost.quantity ||
          originalCost.unit_price_cents !== cost.unit_price_cents
        )) {
          await updateCostMutation.mutateAsync({
            costId: cost.id,
            updateData: {
              description: cost.description,
              quantity: cost.quantity,
              unit_price_cents: cost.unit_price_cents
            }
          });
        }
      }

      // Handle deleted costs
      const deletedCosts = getDeletedCosts();
      for (const cost of deletedCosts) {
        await deleteCostMutation.mutateAsync(cost.id);
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
      // Check current inventory quantity before adjustment (for UX, actual check happens in RPC)
      const { data: currentItem, error: fetchError } = await supabase
        .from('inventory_items')
        .select('quantity_on_hand, name')
        .eq('id', itemId)
        .eq('organization_id', currentOrganization.id)
        .single();

      if (fetchError || !currentItem) {
        toast({
          title: 'Error',
          description: 'Failed to fetch current inventory quantity',
          variant: 'destructive'
        });
        return;
      }

      // Client-side validation: warn if insufficient stock (actual validation happens in RPC with row locking)
      if (currentItem.quantity_on_hand < quantity) {
        toast({
          title: 'Insufficient stock',
          description: `Available: ${currentItem.quantity_on_hand}, Requested: ${quantity}. Proceeding may result in negative inventory.`,
          variant: 'warning'
        });
      }

      // Adjust inventory quantity (decrease by quantity used)
      // RPC function uses FOR UPDATE locking to prevent race conditions
      const newQuantity = await adjustInventoryMutation.mutateAsync({
        organizationId: currentOrganization.id,
        adjustment: {
          itemId,
          delta: -quantity,
          reason: `Used in work order ${workOrderId}`,
          workOrderId
        }
      });

      // Use the name we already fetched, or fallback to querying again
      const itemName = currentItem.name || `Inventory item (ID: ${itemId.substring(0, 8)}...)`;

      // Create work order cost record
      await createCostMutation.mutateAsync({
        work_order_id: workOrderId,
        description: itemName,
        quantity: quantity,
        unit_price_cents: Math.round(unitCost * 100)
      });

      // Show warning if quantity went negative
      if (newQuantity < 0) {
        toast({
          title: 'Inventory adjusted',
          description: `Warning: Inventory quantity is now negative: ${newQuantity}`,
          variant: 'warning'
        });
      } else {
        toast({
          title: 'Part added',
          description: `Added ${quantity} unit(s) from inventory to work order`
        });
      }
    } catch (error) {
      console.error('Error adding part from inventory:', error);
      // Error handling is done in mutation hooks
    }
  };

  const MobileCostDisplay = ({ cost }: { cost: WorkOrderCost }) => (
    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium text-sm">{cost.description}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Added by {cost.created_by_name} • {new Date(cost.created_at).toLocaleDateString()}
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
          <div className="font-medium">{cost.description}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Added by {cost.created_by_name} on{' '}
            {new Date(cost.created_at).toLocaleDateString()}
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
        onRemoveCost={removeCost}
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
    </div>
  );
};

export default InlineEditWorkOrderCosts;
