
import { useState, useCallback } from 'react';
import { WorkOrderCost } from '@/services/workOrderCostsService';

export interface WorkOrderCostItem extends Omit<WorkOrderCost, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'created_by_name'> {
  id: string;
  isNew?: boolean;
  isDeleted?: boolean;
}

export const useWorkOrderCostsState = (initialCosts: WorkOrderCost[] = []) => {
  const [costs, setCosts] = useState<WorkOrderCostItem[]>(() => 
    initialCosts.map(cost => ({
      id: cost.id,
      work_order_id: cost.work_order_id,
      description: cost.description,
      quantity: cost.quantity,
      unit_price_cents: cost.unit_price_cents,
      total_price_cents: cost.total_price_cents
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
      total_price_cents: cost.total_price_cents
    })));
  }, []);

  const ensureMinimumCosts = useCallback(() => {
    const visibleCosts = costs.filter(cost => !cost.isDeleted);
    if (visibleCosts.length === 0) {
      addCost();
    }
  }, [costs, addCost]);

  return {
    costs: costs.filter(cost => !cost.isDeleted),
    addCost,
    removeCost,
    updateCost,
    getCleanCosts,
    getNewCosts,
    getUpdatedCosts,
    getDeletedCosts,
    validateCosts,
    resetCosts,
    ensureMinimumCosts
  };
};
