/**
 * Inventory Types - Type definitions for local inventory system
 * 
 * These types extend the database row types with computed fields from joins.
 * Import from here instead of defining types locally in components/hooks.
 */

import { Tables } from '@/integrations/supabase/types';

// ============================================
// Base Database Types
// ============================================

export type InventoryItemRow = Tables<'inventory_items'>;
export type InventoryTransactionRow = Tables<'inventory_transactions'>;
export type EquipmentPartCompatibilityRow = Tables<'equipment_part_compatibility'>;
export type InventoryItemManagerRow = Tables<'inventory_item_managers'>;

// ============================================
// Primary Inventory Types
// ============================================

/**
 * InventoryItem - The primary type for inventory items.
 * 
 * Extends the database row type with computed fields from joins.
 */
export interface InventoryItem extends InventoryItemRow {
  // Computed fields from joins (camelCase for React conventions)
  createdByName?: string;
  managerNames?: string[];
  compatibleEquipmentCount?: number;
  isLowStock?: boolean;
}

/**
 * InventoryTransaction - Audit log entry for inventory changes.
 * 
 * Every stock adjustment creates a transaction record.
 */
export interface InventoryTransaction extends InventoryTransactionRow {
  // Computed fields from joins
  userName?: string;
  inventoryItemName?: string;
  workOrderTitle?: string;
}

/**
 * EquipmentPartCompatibility - Links inventory items to equipment.
 * 
 * Junction table relationship between equipment and inventory items.
 */
export interface EquipmentPartCompatibility extends EquipmentPartCompatibilityRow {
  // Computed fields from joins
  inventoryItemName?: string;
  equipmentName?: string;
}

/**
 * InventoryItemManager - Links users as managers of inventory items.
 * 
 * Junction table for many-to-many relationship.
 */
export interface InventoryItemManager extends InventoryItemManagerRow {
  // Computed fields from joins
  userName?: string;
  userEmail?: string;
}

// ============================================
// Form & Input Types
// ============================================

/**
 * InventoryItemFormData - Data structure for creating/editing inventory items
 */
export interface InventoryItemFormData {
  name: string;
  description?: string | null;
  sku?: string | null;
  external_id?: string | null;
  quantity_on_hand: number;
  low_stock_threshold: number;
  image_url?: string | null;
  location?: string | null;
  default_unit_cost?: number | null;
  compatibleEquipmentIds?: string[];
  managerIds?: string[];
}

/**
 * InventoryQuantityAdjustment - Data for adjusting inventory quantity
 */
export interface InventoryQuantityAdjustment {
  itemId: string;
  delta: number;
  reason: string;
  workOrderId?: string;
}

/**
 * InventoryFilters - Filter options for inventory list
 */
export interface InventoryFilters {
  search?: string;
  lowStockOnly?: boolean;
  location?: string;
  equipmentId?: string;
}

// ============================================
// Transaction Type Enum
// ============================================

export type InventoryTransactionType = 
  | 'usage'
  | 'restock'
  | 'adjustment'
  | 'initial'
  | 'work_order';

