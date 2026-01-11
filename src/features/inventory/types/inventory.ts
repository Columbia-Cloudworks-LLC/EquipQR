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

// Note: part_compatibility_rules table type will be available after regenerating Supabase types
// For now, define the interface manually to unblock development

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

/**
 * PartCompatibilityRule - Rule-based matching of parts to equipment by manufacturer/model.
 * 
 * Allows defining compatibility patterns like "fits all Caterpillar D6T equipment"
 * instead of linking to specific equipment records.
 */
export interface PartCompatibilityRule {
  id: string;
  inventory_item_id: string;
  manufacturer: string;
  model: string | null;  // null = "any model from this manufacturer"
  manufacturer_norm: string;
  model_norm: string | null;
  created_at: string;
}

/**
 * PartCompatibilityRuleFormData - Form input for creating/editing compatibility rules.
 * 
 * Uses raw values; normalization happens on save.
 */
export interface PartCompatibilityRuleFormData {
  manufacturer: string;
  model: string | null;  // null or empty string = "Any Model"
}

/**
 * CompatibleInventoryItemResult - Result from get_compatible_parts_for_equipment RPC.
 * 
 * Includes match_type to indicate how the part was matched (direct link vs rule).
 */
export interface CompatibleInventoryItemResult {
  inventory_item_id: string;
  name: string;
  sku: string | null;
  external_id: string | null;
  quantity_on_hand: number;
  low_stock_threshold: number;
  default_unit_cost: number | null;
  location: string | null;
  image_url: string | null;
  match_type: 'direct' | 'rule';
}

// ============================================
// Form & Input Types
// ============================================

// NOTE: InventoryItemFormData is defined by Zod schema (source of truth).
// Re-export the inferred type to avoid drift between manual interfaces and validation.
export type InventoryItemFormData = import('@/features/inventory/schemas/inventorySchema').InventoryItemFormData;

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

