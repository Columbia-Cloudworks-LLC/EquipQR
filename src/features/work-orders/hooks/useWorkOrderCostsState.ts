
import { useState, useCallback } from 'react';
import { WorkOrderCost } from '@/features/work-orders/services/workOrderCostsService';

export interface WorkOrderCostItem extends Omit<WorkOrderCost, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'created_by_name'> {
  id: string;
  isNew?: boolean;
  isDeleted?: boolean;
  /** Source inventory item ID (null if manually entered) */
  inventory_item_id?: string | null;
  /** Original quantity when created from inventory (for delta calculations) */
  original_quantity?: number | null;
}

export const useWorkOrderCostsState = (initialCosts: WorkOrderCost[] = []) => {
  const [costs, setCosts] = useState<WorkOrderCostItem[]>(() => 
    initialCosts.map(cost => ({
      id: cost.id,
      work_order_id: cost.work_order_id,
      description: cost.description,
      quantity: cost.quantity,
      unit_price_cents: cost.unit_price_cents,
      total_price_cents: cost.total_price_cents,
      inventory_item_id: cost.inventory_item_id,
      original_quantity: cost.original_quantity
    }))
  );

  const addCost = useCallback(() => {
    const newCost: WorkOrderCostItem = {
      id: crypto.randomUUID(),
      work_order_id: '',
      description: '',
      quantity: 1,
      unit_price_cents: 0,
      total_price_cents: 0,
      isNew: true
    };
    setCosts(prev => [...prev, newCost]);
  }, []);

  /**
   * Add a pre-filled cost item (e.g., from inventory selection).
   * This allows immediate UI feedback when adding items from external sources.
   * 
   * Note: This also removes any empty placeholder rows (new items with empty description)
   * to ensure validation passes when the filled cost is the only real item.
   */
  const addFilledCost = useCallback((data: {
    id: string;
    work_order_id: string;
    description: string;
    quantity: number;
    unit_price_cents: number;
    inventory_item_id?: string;
    original_quantity?: number;
  }) => {
    const newCost: WorkOrderCostItem = {
      id: data.id,
      work_order_id: data.work_order_id,
      description: data.description,
      quantity: data.quantity,
      unit_price_cents: data.unit_price_cents,
      total_price_cents: data.quantity * data.unit_price_cents,
      isNew: false, // Already saved to database
      inventory_item_id: data.inventory_item_id,
      original_quantity: data.original_quantity
    };
    setCosts(prev => {
      // Remove empty placeholder rows (new items with empty description)
      // before adding the filled cost - this ensures validation passes
      const filtered = prev.filter(cost => 
        !(cost.isNew && cost.description.trim() === '')
      );
      return [...filtered, newCost];
    });
  }, []);

  const removeCost = useCallback((id: string) => {
    setCosts(prev => prev.flatMap((cost) => {
      if (cost.id !== id) return cost;
      if (cost.isNew) {
        return [];
      }
      return { ...cost, isDeleted: true };
    }));
  }, []);

  const updateCost = useCallback(<K extends keyof WorkOrderCostItem>(id: string, field: K, value: WorkOrderCostItem[K]) => {
    setCosts(prev => prev.map(cost => {
      if (cost.id === id) {
        const updatedCost: WorkOrderCostItem = { ...cost, [field]: value };
        
        // Recalculate total when quantity or unit price changes
        if (field === 'quantity' || field === 'unit_price_cents') {
          updatedCost.total_price_cents = updatedCost.quantity * updatedCost.unit_price_cents;
        }
        
        return updatedCost;
      }
      return cost;
    }));
  }, []);

  const getCleanCosts = useCallback(() => {
    return costs
      .filter(cost => !cost.isDeleted && cost.description.trim() !== '')
      .map(cost => ({
        ...cost,
        description: cost.description.trim()
      }));
  }, [costs]);

  const getNewCosts = useCallback(() => {
    return costs.filter(cost => cost.isNew && !cost.isDeleted && cost.description.trim() !== '');
  }, [costs]);

  const getUpdatedCosts = useCallback(() => {
    return costs.filter(cost => !cost.isNew && !cost.isDeleted);
  }, [costs]);

  const getDeletedCosts = useCallback(() => {
    return costs.filter(cost => cost.isDeleted && !cost.isNew);
  }, [costs]);

  /**
   * Get costs that have an inventory source (for special handling on delete/edit)
   */
  const getInventorySourcedCosts = useCallback(() => {
    return costs.filter(cost => !cost.isDeleted && cost.inventory_item_id);
  }, [costs]);

  const validateCosts = useCallback(() => {
    return costs.every(cost => 
      cost.isDeleted || 
      (cost.description.trim() !== '' && cost.quantity > 0 && cost.unit_price_cents >= 0)
    );
  }, [costs]);

  const resetCosts = useCallback((newCosts: WorkOrderCost[]) => {
    setCosts(newCosts.map(cost => ({
      id: cost.id,
      work_order_id: cost.work_order_id,
      description: cost.description,
      quantity: cost.quantity,
      unit_price_cents: cost.unit_price_cents,
      total_price_cents: cost.total_price_cents,
      inventory_item_id: cost.inventory_item_id,
      original_quantity: cost.original_quantity
    })));
  }, []);

  const ensureMinimumCosts = useCallback(() => {
    const visibleCosts = costs.filter(cost => !cost.isDeleted);
    if (visibleCosts.length === 0) {
      addCost();
    }
  }, [costs, addCost]);

  /**
   * Check if a specific cost has an inventory source
   */
  const hasInventorySource = useCallback((id: string) => {
    const cost = costs.find(c => c.id === id);
    return !!cost?.inventory_item_id;
  }, [costs]);

  /**
   * Get inventory info for a cost (for confirmation dialogs)
   */
  const getInventoryInfo = useCallback((id: string) => {
    const cost = costs.find(c => c.id === id);
    if (!cost?.inventory_item_id) return null;
    return {
      inventory_item_id: cost.inventory_item_id,
      quantity: cost.quantity,
      original_quantity: cost.original_quantity
    };
  }, [costs]);

  return {
    costs: costs.filter(cost => !cost.isDeleted),
    addCost,
    addFilledCost,
    removeCost,
    updateCost,
    getCleanCosts,
    getNewCosts,
    getUpdatedCosts,
    getDeletedCosts,
    getInventorySourcedCosts,
    hasInventorySource,
    getInventoryInfo,
    validateCosts,
    resetCosts,
    ensureMinimumCosts
  };
};
