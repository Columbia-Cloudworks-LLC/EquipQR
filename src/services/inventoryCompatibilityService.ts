import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import type { InventoryItem } from '@/types/inventory';
import type { Equipment } from './EquipmentService';

// ============================================
// Get Compatible Equipment for Item
// ============================================

export const getCompatibleEquipmentForItem = async (
  organizationId: string,
  itemId: string
): Promise<Equipment[]> => {
  try {
    // Verify item belongs to organization as a failsafe
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('id', itemId)
      .eq('organization_id', organizationId)
      .single();

    if (itemError || !item) {
      throw new Error('Inventory item not found or access denied');
    }

    const { data, error } = await supabase
      .from('equipment_part_compatibility')
      .select(`
        equipment_id,
        equipment:equipment_id(
          id,
          name,
          organization_id
        )
      `)
      .eq('inventory_item_id', itemId)
      .eq('equipment.organization_id', organizationId);

    if (error) throw error;

    const equipment = (data || [])
      .map((row: { equipment: unknown }) => row.equipment)
      .filter(Boolean) as Equipment[];

    return equipment;
  } catch (error) {
    logger.error('Error fetching compatible equipment for item:', error);
    throw error;
  }
};

// ============================================
// Get Compatible Items for Equipment
// ============================================

export const getCompatibleItemsForEquipment = async (
  organizationId: string,
  equipmentId: string
): Promise<InventoryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('equipment_part_compatibility')
      .select(`
        inventory_item_id,
        inventory_items!inner(*)
      `)
      .eq('equipment_id', equipmentId)
      .eq('inventory_items.organization_id', organizationId);

    if (error) throw error;

    return (data || []).map((row: { inventory_items: InventoryItem }) => {
      const item = row.inventory_items as unknown as InventoryItem;
      return {
        ...item,
        isLowStock: item.quantity_on_hand < item.low_stock_threshold
      };
    });
  } catch (error) {
    logger.error('Error fetching compatible items for equipment:', error);
    throw error;
  }
};

// ============================================
// Link/Unlink Items to Equipment
// ============================================

export const linkItemToEquipment = async (
  organizationId: string,
  itemId: string,
  equipmentId: string
): Promise<void> => {
  try {
    // Verify equipment belongs to organization
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select('id')
      .eq('id', equipmentId)
      .eq('organization_id', organizationId)
      .single();

    if (equipmentError || !equipment) {
      throw new Error('Equipment not found or access denied');
    }

    // Verify item belongs to organization
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('id', itemId)
      .eq('organization_id', organizationId)
      .single();

    if (itemError || !item) {
      throw new Error('Inventory item not found or access denied');
    }

    // Insert compatibility link (ignore if already exists)
    const { error } = await supabase
      .from('equipment_part_compatibility')
      .insert({
        equipment_id: equipmentId,
        inventory_item_id: itemId
      })
      .select()
      .single();

    // Ignore duplicate key errors
    if (error && error.code !== '23505') {
      throw error;
    }
  } catch (error) {
    logger.error('Error linking item to equipment:', error);
    throw error;
  }
};

export const unlinkItemFromEquipment = async (
  organizationId: string,
  itemId: string,
  equipmentId: string
): Promise<void> => {
  try {
    // Verify equipment belongs to organization
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select('id')
      .eq('id', equipmentId)
      .eq('organization_id', organizationId)
      .single();

    if (equipmentError || !equipment) {
      throw new Error('Equipment not found or access denied');
    }

    // Verify item belongs to organization
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('id', itemId)
      .eq('organization_id', organizationId)
      .single();

    if (itemError || !item) {
      throw new Error('Inventory item not found or access denied');
    }

    // Delete compatibility link
    const { error } = await supabase
      .from('equipment_part_compatibility')
      .delete()
      .eq('equipment_id', equipmentId)
      .eq('inventory_item_id', itemId);

    if (error) throw error;
  } catch (error) {
    logger.error('Error unlinking item from equipment:', error);
    throw error;
  }
};

// ============================================
// Bulk Link Equipment to Item
// ============================================

export const bulkLinkEquipmentToItem = async (
  organizationId: string,
  itemId: string,
  equipmentIds: string[]
): Promise<{ added: number; removed: number }> => {
  try {
    // Verify item belongs to organization FIRST (before any operations)
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('id', itemId)
      .eq('organization_id', organizationId)
      .single();

    if (itemError || !item) {
      throw new Error('Inventory item not found or access denied');
    }

    if (equipmentIds.length === 0) {
      // If no equipment selected, remove all links
      // Count existing links before deleting
      const { count, error: countError } = await supabase
        .from('equipment_part_compatibility')
        .select('equipment_id', { count: 'exact', head: true })
        .eq('inventory_item_id', itemId);

      if (countError) {
        throw countError;
      }

      const { error: deleteError } = await supabase
        .from('equipment_part_compatibility')
        .delete()
        .eq('inventory_item_id', itemId);

      if (deleteError) {
        throw deleteError;
      }
      
      return { added: 0, removed: count ?? 0 };
    }

    // Verify all equipment belong to organization
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select('id')
      .eq('organization_id', organizationId)
      .in('id', equipmentIds);

    if (equipmentError) throw equipmentError;

    if (!equipment || equipment.length !== equipmentIds.length) {
      throw new Error('One or more equipment items not found or access denied');
    }

    // Get current links
    const { data: currentLinks, error: currentLinksError } = await supabase
      .from('equipment_part_compatibility')
      .select('equipment_id')
      .eq('inventory_item_id', itemId);

    if (currentLinksError) {
      throw currentLinksError;
    }
    const currentEquipmentIds = (currentLinks || []).map((link: { equipment_id: string }) => link.equipment_id);
    
    // Calculate changes
    const toAdd = equipmentIds.filter(id => !currentEquipmentIds.includes(id));
    const toRemove = currentEquipmentIds.filter(id => !equipmentIds.includes(id));

    // Remove unselected equipment
    if (toRemove.length > 0) {
      await supabase
        .from('equipment_part_compatibility')
        .delete()
        .eq('inventory_item_id', itemId)
        .in('equipment_id', toRemove);
    }

    // Insert new links
    if (toAdd.length > 0) {
      const { error } = await supabase
        .from('equipment_part_compatibility')
        .insert(
          toAdd.map(equipmentId => ({
            equipment_id: equipmentId,
            inventory_item_id: itemId
          }))
        );

      if (error) throw error;
    }

    return { added: toAdd.length, removed: toRemove.length };
  } catch (error) {
    logger.error('Error bulk linking equipment to item:', error);
    throw error;
  }
};

// ============================================
// Bulk Link Items to Equipment
// ============================================

export const bulkLinkItemsToEquipment = async (
  organizationId: string,
  itemIds: string[],
  equipmentId: string
): Promise<void> => {
  try {
    if (itemIds.length === 0) return;

    // Verify equipment belongs to organization
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select('id')
      .eq('id', equipmentId)
      .eq('organization_id', organizationId)
      .single();

    if (equipmentError || !equipment) {
      throw new Error('Equipment not found or access denied');
    }

    // Verify all items belong to organization
    const { data: items, error: itemsError } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('organization_id', organizationId)
      .in('id', itemIds);

    if (itemsError) throw itemsError;

    if (!items || items.length !== itemIds.length) {
      throw new Error('One or more inventory items not found or access denied');
    }

    // Delete existing links for this equipment
    await supabase
      .from('equipment_part_compatibility')
      .delete()
      .eq('equipment_id', equipmentId);

    // Insert new links
    const { error } = await supabase
      .from('equipment_part_compatibility')
      .insert(
        itemIds.map(itemId => ({
          equipment_id: equipmentId,
          inventory_item_id: itemId
        }))
      );

    if (error) throw error;
  } catch (error) {
    logger.error('Error bulk linking items to equipment:', error);
    throw error;
  }
};

