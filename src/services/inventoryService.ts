import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import type {
  InventoryItem,
  InventoryTransaction,
  InventoryItemFormData,
  InventoryQuantityAdjustment,
  InventoryFilters
} from '@/types/inventory';

// ============================================
// Get Inventory Items
// ============================================

export const getInventoryItems = async (
  organizationId: string,
  filters: InventoryFilters = {}
): Promise<InventoryItem[]> => {
  try {
    let query = supabase
      .from('inventory_items')
      .select('*')
      .eq('organization_id', organizationId);

    // Apply search filter
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,external_id.ilike.%${filters.search}%`
      );
    }

    // Apply low stock filter - this is handled client-side after fetch
    // (PostgreSQL doesn't support comparing two columns directly in WHERE clause easily)

    // Apply location filter
    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    // Note: Equipment compatibility filter is not applied in this function.
    // Use getCompatibleInventoryItems for equipment-based filtering.

    const { data, error } = await query.order('name', { ascending: true });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a65f405d-0706-4f0e-be3a-35b48c38930e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'inventoryService.ts:43',message:'Query result',data:{error:error?{code:error.code,message:error.message,hint:error.hint,details:error.details}:null,dataLength:data?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (error) throw error;

    // Calculate low stock status and apply low stock filter if needed
    let items = (data || []).map(item => ({
      ...item,
      isLowStock: item.quantity_on_hand < item.low_stock_threshold
    }));

    // Apply low stock filter client-side
    if (filters.lowStockOnly) {
      items = items.filter(item => item.isLowStock);
    }

    return items;
  } catch (error) {
    logger.error('Error fetching inventory items:', error);
    throw error;
  }
};

export const getInventoryItemById = async (
  organizationId: string,
  itemId: string
): Promise<InventoryItem | null> => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', itemId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    if (!data) return null;

    return {
      ...data,
      isLowStock: data.quantity_on_hand < data.low_stock_threshold
    };
  } catch (error) {
    logger.error('Error fetching inventory item:', error);
    throw error;
  }
};

// ============================================
// Create/Update/Delete Inventory Items
// ============================================

export const createInventoryItem = async (
  organizationId: string,
  formData: InventoryItemFormData,
  userId: string
): Promise<InventoryItem> => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/a65f405d-0706-4f0e-be3a-35b48c38930e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'inventoryService.ts:98',message:'createInventoryItem called',data:{organizationId,userId,name:formData.name,quantity_on_hand:formData.quantity_on_hand},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  try {
    // Create the inventory item
    const { data: itemData, error: itemError } = await supabase
      .from('inventory_items')
      .insert({
        organization_id: organizationId,
        name: formData.name,
        description: formData.description || null,
        sku: formData.sku || null,
        external_id: formData.external_id || null,
        quantity_on_hand: formData.quantity_on_hand,
        low_stock_threshold: formData.low_stock_threshold,
        image_url: formData.image_url || null,
        location: formData.location || null,
        default_unit_cost: formData.default_unit_cost || null,
        created_by: userId
      })
      .select()
      .single();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a65f405d-0706-4f0e-be3a-35b48c38930e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'inventoryService.ts:123',message:'Insert result',data:{error:itemError?{code:itemError.code,message:itemError.message,hint:itemError.hint,details:itemError.details}:null,itemDataId:itemData?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (itemError) throw itemError;

    // Create initial transaction if quantity > 0
    if (formData.quantity_on_hand > 0) {
      await supabase
        .from('inventory_transactions')
        .insert({
          inventory_item_id: itemData.id,
          organization_id: organizationId,
          user_id: userId,
          previous_quantity: 0,
          new_quantity: formData.quantity_on_hand,
          change_amount: formData.quantity_on_hand,
          transaction_type: 'initial',
          notes: 'Initial stock'
        });
    }

    // Link compatible equipment
    if (formData.compatibleEquipmentIds && formData.compatibleEquipmentIds.length > 0) {
      await supabase
        .from('equipment_part_compatibility')
        .insert(
          formData.compatibleEquipmentIds.map(equipmentId => ({
            equipment_id: equipmentId,
            inventory_item_id: itemData.id
          }))
        );
    }

    // Assign managers
    if (formData.managerIds && formData.managerIds.length > 0) {
      await supabase
        .from('inventory_item_managers')
        .insert(
          formData.managerIds.map(managerId => ({
            inventory_item_id: itemData.id,
            user_id: managerId
          }))
        );
    }

    return {
      ...itemData,
      isLowStock: itemData.quantity_on_hand < itemData.low_stock_threshold
    };
  } catch (error) {
    logger.error('Error creating inventory item:', error);
    throw error;
  }
};

export const updateInventoryItem = async (
  organizationId: string,
  itemId: string,
  formData: Partial<InventoryItemFormData>
): Promise<InventoryItem> => {
  try {
    const updateData: Record<string, unknown> = {};

    if (formData.name !== undefined) updateData.name = formData.name;
    if (formData.description !== undefined) updateData.description = formData.description || null;
    if (formData.sku !== undefined) updateData.sku = formData.sku || null;
    if (formData.external_id !== undefined) updateData.external_id = formData.external_id || null;
    if (formData.low_stock_threshold !== undefined) updateData.low_stock_threshold = formData.low_stock_threshold;
    if (formData.image_url !== undefined) updateData.image_url = formData.image_url || null;
    if (formData.location !== undefined) updateData.location = formData.location || null;
    if (formData.default_unit_cost !== undefined) updateData.default_unit_cost = formData.default_unit_cost || null;

    const { data, error } = await supabase
      .from('inventory_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    // Update compatible equipment if provided
    if (formData.compatibleEquipmentIds !== undefined) {
      // Delete existing links
      await supabase
        .from('equipment_part_compatibility')
        .delete()
        .eq('inventory_item_id', itemId);

      // Insert new links
      if (formData.compatibleEquipmentIds.length > 0) {
        await supabase
          .from('equipment_part_compatibility')
          .insert(
            formData.compatibleEquipmentIds.map(equipmentId => ({
              equipment_id: equipmentId,
              inventory_item_id: itemId
            }))
          );
      }
    }

    // Update managers if provided
    if (formData.managerIds !== undefined) {
      // Delete existing assignments
      await supabase
        .from('inventory_item_managers')
        .delete()
        .eq('inventory_item_id', itemId);

      // Insert new assignments
      if (formData.managerIds.length > 0) {
        await supabase
          .from('inventory_item_managers')
          .insert(
            formData.managerIds.map(managerId => ({
              inventory_item_id: itemId,
              user_id: managerId
            }))
          );
      }
    }

    return {
      ...data,
      isLowStock: data.quantity_on_hand < data.low_stock_threshold
    };
  } catch (error) {
    logger.error('Error updating inventory item:', error);
    throw error;
  }
};

export const deleteInventoryItem = async (
  organizationId: string,
  itemId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', itemId)
      .eq('organization_id', organizationId);

    if (error) throw error;
  } catch (error) {
    logger.error('Error deleting inventory item:', error);
    throw error;
  }
};

// ============================================
// Quantity Adjustment (RPC)
// ============================================

export const adjustInventoryQuantity = async (
  organizationId: string,
  adjustment: InventoryQuantityAdjustment
): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('adjust_inventory_quantity', {
      p_item_id: adjustment.itemId,
      p_delta: adjustment.delta,
      p_reason: adjustment.reason,
      p_work_order_id: adjustment.workOrderId || null
    });

    if (error) throw error;

    return data as number;
  } catch (error) {
    logger.error('Error adjusting inventory quantity:', error);
    throw error;
  }
};

// ============================================
// Transactions
// ============================================

export const getInventoryTransactions = async (
  organizationId: string,
  itemId?: string
): Promise<InventoryTransaction[]> => {
  try {
    // Fetch transactions with inventory item names (this join works because there's a FK)
    let query = supabase
      .from('inventory_transactions')
      .select(`
        *,
        inventory_items!inner(name)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (itemId) {
      query = query.eq('inventory_item_id', itemId);
    }

    const { data, error } = await query.limit(1000);

    if (error) throw error;

    // Fetch profiles separately (since there's no direct FK from inventory_transactions to profiles)
    const userIds = [...new Set((data || []).map(t => t.user_id))];
    let profiles: Record<string, { name: string }> = {};
    
    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds)
        .eq('organization_id', organizationId);

      if (!profilesError && profilesData) {
        profiles = profilesData.reduce((acc, p) => {
          acc[p.id] = { name: p.name };
          return acc;
        }, {} as Record<string, { name: string }>);
      }
    }

    return (data || []).map(transaction => ({
      ...transaction,
      inventoryItemName: (transaction.inventory_items as { name: string })?.name,
      userName: profiles[transaction.user_id]?.name
    }));
  } catch (error) {
    logger.error('Error fetching inventory transactions:', error);
    throw error;
  }
};

// ============================================
// Compatible Items
// ============================================

export const getCompatibleInventoryItems = async (
  organizationId: string,
  equipmentIds: string[]
): Promise<InventoryItem[]> => {
  try {
    if (equipmentIds.length === 0) {
      return [];
    }

    // Get all inventory items compatible with any of the equipment
    const { data, error } = await supabase
      .from('equipment_part_compatibility')
      .select(`
        inventory_item_id,
        inventory_items!inner(*)
      `)
      .in('equipment_id', equipmentIds)
      .eq('inventory_items.organization_id', organizationId);

    if (error) throw error;

    // Extract unique inventory items
    const itemMap = new Map<string, InventoryItem>();
    (data || []).forEach((row: { inventory_items: InventoryItem }) => {
      const item = row.inventory_items as unknown as InventoryItem;
      if (!itemMap.has(item.id)) {
        itemMap.set(item.id, {
          ...item,
          isLowStock: item.quantity_on_hand < item.low_stock_threshold
        });
      }
    });

    return Array.from(itemMap.values());
  } catch (error) {
    logger.error('Error fetching compatible inventory items:', error);
    throw error;
  }
};

// ============================================
// Managers
// ============================================

export const getInventoryItemManagers = async (
  organizationId: string,
  itemId: string
): Promise<Array<{ userId: string; userName: string; userEmail: string }>> => {
  try {
    const { data, error } = await supabase
      .from('inventory_item_managers')
      .select(`
        user_id,
        profiles!inventory_item_managers_user_id_fkey(id, name, email)
      `)
      .eq('inventory_item_id', itemId);

    if (error) throw error;

    return (data || []).map((row: {
      user_id: string;
      profiles: { id: string; name: string; email: string } | null;
    }) => ({
      userId: row.user_id,
      userName: row.profiles?.name || 'Unknown',
      userEmail: row.profiles?.email || ''
    }));
  } catch (error) {
    logger.error('Error fetching inventory item managers:', error);
    throw error;
  }
};

export const assignInventoryManagers = async (
  organizationId: string,
  itemId: string,
  userIds: string[]
): Promise<void> => {
  try {
    // Delete existing assignments
    await supabase
      .from('inventory_item_managers')
      .delete()
      .eq('inventory_item_id', itemId);

    // Insert new assignments
    if (userIds.length > 0) {
      const { error } = await supabase
        .from('inventory_item_managers')
        .insert(
          userIds.map(userId => ({
            inventory_item_id: itemId,
            user_id: userId
          }))
        );

      if (error) throw error;
    }
  } catch (error) {
    logger.error('Error assigning inventory managers:', error);
    throw error;
  }
};

