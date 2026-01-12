import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import type {
  InventoryItem,
  InventoryTransaction,
  InventoryQuantityAdjustment,
  InventoryFilters,
  PartialInventoryItem
} from '@/features/inventory/types/inventory';
import type { InventoryItemFormData } from '@/features/inventory/schemas/inventorySchema';
import { bulkSetCompatibilityRules } from '@/features/inventory/services/inventoryCompatibilityRulesService';

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

    // Save compatibility rules (manufacturer/model patterns)
    if (formData.compatibilityRules && formData.compatibilityRules.length > 0) {
      await bulkSetCompatibilityRules(organizationId, itemData.id, formData.compatibilityRules);
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

    // Update compatibility rules if provided
    if (formData.compatibilityRules !== undefined) {
      await bulkSetCompatibilityRules(organizationId, itemId, formData.compatibilityRules);
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

export interface TransactionPaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedTransactionsResult {
  transactions: InventoryTransaction[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export const DEFAULT_TRANSACTION_LIMIT = 50;

export const getInventoryTransactions = async (
  organizationId: string,
  itemId?: string,
  pagination?: TransactionPaginationParams
): Promise<PaginatedTransactionsResult> => {
  try {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? DEFAULT_TRANSACTION_LIMIT;
    const startIndex = (page - 1) * limit;

    // Fetch transactions with count in a single query (reduces database round trips)
    let query = supabase
      .from('inventory_transactions')
      .select(`
        *,
        inventory_items!inner(name)
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(startIndex, startIndex + limit - 1);

    if (itemId) {
      query = query.eq('inventory_item_id', itemId);
    }

    const { data, count: totalCount, error } = await query;

    if (error) throw error;

    // Fetch profiles separately because inventory_transactions.user_id references auth.users (not public.profiles).
    // Supabase's PostgREST relational queries require a direct FK to the target table for automatic joins.
    // Since profiles.id also references auth.users (no direct FK from transactions->profiles), we must
    // query profiles in a separate request. This adds one round-trip but ensures reliable user name lookups.
    const userIds = [...new Set((data || []).map(t => t.user_id).filter(Boolean))];
    let profiles: Record<string, { name: string }> = {};
    
    if (userIds.length > 0) {
      // Resolve names via organization_members -> profiles join to keep results scoped to the org.
      const { data: memberRows, error: memberError } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          profiles:user_id!inner(id, name)
        `)
        .eq('organization_id', organizationId)
        .in('user_id', userIds)
        .limit(userIds.length);

      if (memberError) {
        logger.warn('Error fetching user profiles for inventory transactions:', memberError);
      }

      if (!memberError && memberRows) {
        profiles = memberRows.reduce((acc, row: { user_id: string; profiles: { name: string } | null }) => {
          acc[row.user_id] = { name: row.profiles?.name ?? 'Unknown User' };
          return acc;
        }, {} as Record<string, { name: string }>);
      }
    }

    const transactions = (data || []).map(transaction => ({
      ...transaction,
      inventoryItemName: (transaction.inventory_items as { name: string })?.name,
      userName: profiles[transaction.user_id]?.name ?? 'Unknown User'
    }));

    return {
      transactions,
      totalCount: totalCount ?? 0,
      page,
      limit,
      hasMore: startIndex + transactions.length < (totalCount ?? 0)
    };
  } catch (error) {
    logger.error('Error fetching inventory transactions:', error);
    throw error;
  }
};

// ============================================
// Compatible Items
// ============================================

/**
 * Get inventory items compatible with given equipment IDs.
 * 
 * Uses the get_compatible_parts_for_equipment RPC function which combines:
 * - Direct links (equipment_part_compatibility table)
 * - Rule-based matches (part_compatibility_rules by manufacturer/model)
 * 
 * Results are deduplicated by inventory_item_id.
 * 
 * @returns PartialInventoryItem[] - A subset of fields optimized for display.
 *          Does NOT include created_by, created_at, or updated_at.
 *          Use getInventoryItem() if you need the full item.
 */
export const getCompatibleInventoryItems = async (
  organizationId: string,
  equipmentIds: string[]
): Promise<PartialInventoryItem[]> => {
  try {
    if (equipmentIds.length === 0) {
      return [];
    }

    // Call the RPC function that combines direct links + rule-based matches
    const { data, error } = await supabase.rpc('get_compatible_parts_for_equipment', {
      p_organization_id: organizationId,
      p_equipment_ids: equipmentIds
    });

    if (error) throw error;

    // The RPC returns rows with inventory item fields + match_type
    // Deduplicate by inventory_item_id and map to PartialInventoryItem type
    const itemMap = new Map<string, PartialInventoryItem>();
    
    for (const row of (data || [])) {
      if (!itemMap.has(row.inventory_item_id)) {
        itemMap.set(row.inventory_item_id, {
          id: row.inventory_item_id,
          organization_id: organizationId,
          name: row.name,
          description: null, // Not returned by RPC for performance
          sku: row.sku,
          external_id: row.external_id,
          quantity_on_hand: row.quantity_on_hand,
          low_stock_threshold: row.low_stock_threshold,
          image_url: row.image_url,
          location: row.location,
          default_unit_cost: row.default_unit_cost,
          isLowStock: row.quantity_on_hand < row.low_stock_threshold
        });
      }
    }

    return Array.from(itemMap.values());
  } catch (error) {
    logger.error('Error fetching compatible inventory items:', error);
    throw error;
  }
};

// Note: Per-item inventory managers have been deprecated.
// Use organization-level parts managers instead (see partsManagersService.ts).

