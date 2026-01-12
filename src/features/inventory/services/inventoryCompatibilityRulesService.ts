import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import type { PartCompatibilityRule, PartCompatibilityRuleFormData, EquipmentMatchedByRules, ModelMatchType, VerificationStatus } from '@/features/inventory/types/inventory';

// ============================================
// Normalization Helpers
// ============================================

/**
 * Normalize a string for case-insensitive + trimmed matching.
 * Matches the database normalization: lower(trim(value))
 */
const normalizeValue = (value: string): string => {
  return value.trim().toLowerCase();
};

// ============================================
// Get Compatibility Rules for Item
// ============================================

/**
 * Get all compatibility rules for an inventory item.
 * 
 * @param organizationId - Organization ID for access control
 * @param itemId - Inventory item ID
 * @returns Array of compatibility rules
 */
export const getCompatibilityRulesForItem = async (
  organizationId: string,
  itemId: string
): Promise<PartCompatibilityRule[]> => {
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
      .from('part_compatibility_rules')
      .select('*')
      .eq('inventory_item_id', itemId)
      .order('manufacturer', { ascending: true })
      .order('model', { ascending: true, nullsFirst: false });

    if (error) throw error;

    return (data || []) as PartCompatibilityRule[];
  } catch (error) {
    logger.error('Error fetching compatibility rules for item:', error);
    throw error;
  }
};

// ============================================
// Add Compatibility Rule
// ============================================

/**
 * Add a single compatibility rule for an inventory item.
 * 
 * @param organizationId - Organization ID for access control
 * @param itemId - Inventory item ID
 * @param rule - Rule data (manufacturer, model)
 * @returns The created rule
 */
export const addCompatibilityRule = async (
  organizationId: string,
  itemId: string,
  rule: PartCompatibilityRuleFormData
): Promise<PartCompatibilityRule> => {
  try {
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

    // Normalize values for matching
    const manufacturerNorm = normalizeValue(rule.manufacturer);
    const modelNorm = rule.model ? normalizeValue(rule.model) : null;

    const { data, error } = await supabase
      .from('part_compatibility_rules')
      .insert({
        inventory_item_id: itemId,
        manufacturer: rule.manufacturer.trim(),
        model: rule.model?.trim() || null,
        manufacturer_norm: manufacturerNorm,
        model_norm: modelNorm
      })
      .select()
      .single();

    // Handle duplicate key error gracefully
    if (error) {
      if (error.code === '23505') {
        throw new Error('This manufacturer/model combination already exists for this item');
      }
      throw error;
    }

    return data as PartCompatibilityRule;
  } catch (error) {
    logger.error('Error adding compatibility rule:', error);
    throw error;
  }
};

// ============================================
// Remove Compatibility Rule
// ============================================

/**
 * Remove a compatibility rule by ID.
 * 
 * @param organizationId - Organization ID for access control
 * @param ruleId - Rule ID to remove
 */
export const removeCompatibilityRule = async (
  organizationId: string,
  ruleId: string
): Promise<void> => {
  try {
    // Verify rule belongs to an item in the organization (via RLS + explicit check)
    const { data: rule, error: ruleError } = await supabase
      .from('part_compatibility_rules')
      .select(`
        id,
        inventory_items!inner(organization_id)
      `)
      .eq('id', ruleId)
      .single();

    if (ruleError || !rule) {
      throw new Error('Compatibility rule not found or access denied');
    }

    // Type assertion for the joined data
    const ruleData = rule as { id: string; inventory_items: { organization_id: string } };
    if (ruleData.inventory_items.organization_id !== organizationId) {
      throw new Error('Compatibility rule not found or access denied');
    }

    const { error } = await supabase
      .from('part_compatibility_rules')
      .delete()
      .eq('id', ruleId);

    if (error) throw error;
  } catch (error) {
    logger.error('Error removing compatibility rule:', error);
    throw error;
  }
};

// ============================================
// Bulk Set Compatibility Rules
// ============================================

/**
 * Replace all compatibility rules for an inventory item.
 * Uses an atomic PostgreSQL RPC function for guaranteed transaction safety.
 * 
 * The RPC function `bulk_set_compatibility_rules` wraps delete-insert in a single
 * PostgreSQL transaction. If insert fails after delete, the entire transaction
 * rolls back automatically - no data loss possible.
 * 
 * Now supports match_type for pattern matching (any, exact, prefix, wildcard).
 * 
 * @param organizationId - Organization ID for access control
 * @param itemId - Inventory item ID
 * @param rules - Array of rules to set (replaces existing)
 * @returns Object with counts of rules set
 */
export const bulkSetCompatibilityRules = async (
  organizationId: string,
  itemId: string,
  rules: PartCompatibilityRuleFormData[]
): Promise<{ rulesSet: number }> => {
  try {
    // Filter out rules with empty manufacturers (invalid/incomplete rules)
    const validRules = rules.filter(rule => rule.manufacturer.trim().length > 0);

    // Convert rules to JSONB format for the RPC function
    // Now includes match_type, status, and notes
    const rulesJsonb = validRules.map(rule => ({
      manufacturer: rule.manufacturer.trim(),
      model: rule.model?.trim() || null,
      match_type: rule.match_type || 'exact',
      status: rule.status || 'unverified',
      notes: rule.notes || null
    }));

    // Call the atomic RPC function
    const { data, error } = await supabase.rpc('bulk_set_compatibility_rules', {
      p_organization_id: organizationId,
      p_item_id: itemId,
      p_rules: rulesJsonb
    });

    if (error) {
      // Handle permission errors with user-friendly message
      if (error.code === '42501') {
        throw new Error('Inventory item not found or access denied');
      }
      throw error;
    }

    return { rulesSet: data ?? 0 };
  } catch (error) {
    logger.error('Error bulk setting compatibility rules:', error);
    throw error;
  }
};

// ============================================
// Count Equipment Matching Rules
// ============================================

/**
 * Count how many equipment items match a given set of rules.
 * Used for displaying match count in the UI as users edit compatibility rules.
 * 
 * Uses a server-side PostgreSQL RPC function for efficient counting.
 * This approach:
 * - Reduces network payload from O(n) equipment rows to O(1) integer
 * - Leverages database indexes for faster matching
 * - Scales well for large fleets (500+ items)
 * 
 * @param organizationId - Organization ID
 * @param rules - Array of rules to match against (now supports match_type)
 * @returns Count of matching equipment
 */
export const countEquipmentMatchingRules = async (
  organizationId: string,
  rules: PartCompatibilityRuleFormData[]
): Promise<number> => {
  try {
    // Filter out invalid rules with empty manufacturers
    const validRules = rules.filter(rule => rule.manufacturer.trim().length > 0);
    
    if (validRules.length === 0) {
      return 0;
    }

    // Convert rules to JSONB format for the RPC function
    // Now includes match_type for pattern matching support
    const rulesJsonb = validRules.map(rule => {
      const matchType = rule.match_type || 'exact';
      let model = rule.model?.trim() || null;
      
      // For wildcard patterns, convert client-side * to SQL % before sending
      if (matchType === 'wildcard' && model) {
        model = model.replace(/\*/g, '%').replace(/\?/g, '_');
      }
      
      return {
        manufacturer: rule.manufacturer.trim(),
        model: model,
        match_type: matchType
      };
    });

    // Call the server-side RPC function for efficient counting
    const { data, error } = await supabase.rpc('count_equipment_matching_rules', {
      p_organization_id: organizationId,
      p_rules: rulesJsonb
    });

    if (error) {
      // Handle permission errors
      if (error.code === '42501') {
        throw new Error('Access denied');
      }
      throw error;
    }

    return data ?? 0;
  } catch (error) {
    logger.error('Error counting equipment matching rules:', error);
    throw error;
  }
};

// ============================================
// Get Equipment Matching Item's Rules
// ============================================

/**
 * Get equipment that matches an inventory item's compatibility rules.
 * 
 * This is the inverse of getCompatibleInventoryItems - instead of finding parts
 * for equipment, it finds equipment that matches a part's compatibility rules.
 * 
 * @param organizationId - Organization ID for access control
 * @param itemId - Inventory item ID
 * @returns Array of equipment that matches the item's rules
 */
export const getEquipmentMatchingItemRules = async (
  organizationId: string,
  itemId: string
): Promise<EquipmentMatchedByRules[]> => {
  try {
    const { data, error } = await supabase.rpc('get_equipment_for_inventory_item_rules', {
      p_organization_id: organizationId,
      p_item_id: itemId
    });

    if (error) {
      // Handle permission errors with user-friendly message
      if (error.code === '42501') {
        throw new Error('Inventory item not found or access denied');
      }
      throw error;
    }

    // Map the RPC result to typed interface
    return (data || []).map((row: {
      equipment_id: string;
      name: string;
      manufacturer: string;
      model: string;
      serial_number: string | null;
      status: string;
      location: string | null;
      matched_rule_id: string;
      matched_rule_manufacturer: string;
      matched_rule_model: string | null;
      matched_rule_match_type: string;
      matched_rule_status: string;
    }) => ({
      equipment_id: row.equipment_id,
      name: row.name,
      manufacturer: row.manufacturer,
      model: row.model,
      serial_number: row.serial_number,
      status: row.status,
      location: row.location,
      matched_rule_id: row.matched_rule_id,
      matched_rule_manufacturer: row.matched_rule_manufacturer,
      matched_rule_model: row.matched_rule_model,
      matched_rule_match_type: row.matched_rule_match_type as ModelMatchType,
      matched_rule_status: row.matched_rule_status as VerificationStatus
    }));
  } catch (error) {
    logger.error('Error fetching equipment matching item rules:', error);
    throw error;
  }
};
