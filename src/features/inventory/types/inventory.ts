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

// Note: InventoryItemManagerRow has been deprecated.
// Parts managers are now managed at the organization level.
// See partsManagersService.ts for the new PartsManager type.

// ============================================
// Enums (matching database enums)
// ============================================

export type PartIdentifierType = 'oem' | 'aftermarket' | 'sku' | 'mpn' | 'upc' | 'cross_ref';
export type VerificationStatus = 'unverified' | 'verified' | 'deprecated';
export type ModelMatchType = 'any' | 'exact' | 'prefix' | 'wildcard';

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

// Note: InventoryItemManager interface has been deprecated.
// Use PartsManager from partsManagersService.ts instead.

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
  match_type: ModelMatchType;  // 'any', 'exact', 'prefix', 'wildcard'
  model_pattern_raw: string | null;  // Original pattern for prefix/wildcard
  model_pattern_norm: string | null;  // Normalized pattern for matching
  status: VerificationStatus;
  notes: string | null;
  evidence_url: string | null;
  created_by: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * PartCompatibilityRuleFormData - Form input for creating/editing compatibility rules.
 * 
 * Uses raw values; normalization happens on save.
 */
export interface PartCompatibilityRuleFormData {
  manufacturer: string;
  model: string | null;  // null or empty string = "Any Model" for 'any' match_type
  match_type?: ModelMatchType;  // Defaults to 'exact' if not specified
  status?: VerificationStatus;  // Defaults to 'unverified'
  notes?: string | null;
}

// ============================================
// Part Alternate Group Types
// ============================================

/**
 * PartAlternateGroup - A group of interchangeable parts.
 */
export interface PartAlternateGroup {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: VerificationStatus;
  notes: string | null;
  evidence_url: string | null;
  created_by: string;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * PartIdentifier - A part number/identifier that can be looked up.
 */
export interface PartIdentifier {
  id: string;
  organization_id: string;
  identifier_type: PartIdentifierType;
  raw_value: string;
  norm_value: string;
  inventory_item_id: string | null;
  manufacturer: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

/**
 * AlternatePartResult - Result from get_alternates_for_part_number RPC.
 */
export interface AlternatePartResult {
  // Group info
  group_id: string;
  group_name: string;
  group_status: VerificationStatus;
  group_verified: boolean;
  group_notes: string | null;
  
  // Identifier info
  identifier_id: string | null;
  identifier_type: PartIdentifierType | null;
  identifier_value: string | null;
  identifier_manufacturer: string | null;
  
  // Inventory item info
  inventory_item_id: string | null;
  inventory_name: string | null;
  inventory_sku: string | null;
  quantity_on_hand: number;
  low_stock_threshold: number;
  default_unit_cost: number | null;
  location: string | null;
  image_url: string | null;
  is_in_stock: boolean;
  is_low_stock: boolean;
  
  // Member metadata
  is_primary: boolean;
  is_matching_input: boolean;
}

/**
 * MakeModelCompatiblePart - Result from get_compatible_parts_for_make_model RPC.
 */
export interface MakeModelCompatiblePart {
  inventory_item_id: string;
  name: string;
  sku: string | null;
  external_id: string | null;
  quantity_on_hand: number;
  low_stock_threshold: number;
  default_unit_cost: number | null;
  location: string | null;
  image_url: string | null;
  match_type: 'rule';
  rule_match_type: ModelMatchType;
  rule_status: VerificationStatus;
  is_in_stock: boolean;
  is_verified: boolean;
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

/**
 * EquipmentMatchedByRules - Equipment that matches an inventory item's compatibility rules.
 * 
 * Result from get_equipment_for_inventory_item_rules RPC.
 * Shows equipment that is compatible with an inventory item based on manufacturer/model rules.
 */
export interface EquipmentMatchedByRules {
  equipment_id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string | null;
  status: string;
  location: string | null;
  // Rule that matched this equipment
  matched_rule_id: string;
  matched_rule_manufacturer: string;
  matched_rule_model: string | null;
  matched_rule_match_type: ModelMatchType;
  matched_rule_status: VerificationStatus;
}

/**
 * PartialInventoryItem - A subset of InventoryItem fields for display-only purposes.
 * 
 * Used by functions like getCompatibleInventoryItems that return items from RPC
 * functions optimized for performance. Fields like description, created_by,
 * created_at, and updated_at are not fetched to reduce payload size.
 * 
 * Consumers should NOT rely on metadata fields (created_by, created_at, updated_at)
 * from this type. If those fields are needed, fetch the full item directly.
 */
export interface PartialInventoryItem {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;  // Often null in partial results
  sku: string | null;
  external_id: string | null;
  quantity_on_hand: number;
  low_stock_threshold: number;
  image_url: string | null;
  location: string | null;
  default_unit_cost: number | null;
  isLowStock?: boolean;
  hasAlternates?: boolean;  // Indicates if part belongs to an alternate group
  // Note: created_by, created_at, updated_at are intentionally omitted
  // to avoid implying they have valid values
}

// ============================================
// Inventory Item Image Types
// ============================================

/**
 * InventoryItemImage - Metadata for images uploaded to inventory items.
 * Up to 5 images per item, stored in the inventory_item_images table.
 */
export interface InventoryItemImage {
  id: string;
  inventory_item_id: string;
  organization_id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  uploaded_by_name: string | null;
  created_at: string;
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

