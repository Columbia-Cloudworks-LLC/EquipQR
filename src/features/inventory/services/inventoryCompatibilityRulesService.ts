import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import type { PartCompatibilityRule, PartCompatibilityRuleFormData } from '@/features/inventory/types/inventory';

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
 * Uses delete-then-insert pattern for simplicity and atomicity.
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
    // Verify item belongs to organization FIRST
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('id', itemId)
      .eq('organization_id', organizationId)
      .single();

    if (itemError || !item) {
      throw new Error('Inventory item not found or access denied');
    }

    // Delete all existing rules for this item
    const { error: deleteError } = await supabase
      .from('part_compatibility_rules')
      .delete()
      .eq('inventory_item_id', itemId);

    if (deleteError) {
      throw deleteError;
    }

    // Filter out rules with empty manufacturers (invalid/incomplete rules)
    const validRules = rules.filter(rule => rule.manufacturer.trim().length > 0);

    // If no valid rules, we're done
    if (validRules.length === 0) {
      return { rulesSet: 0 };
    }

    // Deduplicate rules by normalized manufacturer/model
    const uniqueRules = new Map<string, PartCompatibilityRuleFormData>();
    for (const rule of validRules) {
      const manufacturerNorm = normalizeValue(rule.manufacturer);
      const modelNorm = rule.model ? normalizeValue(rule.model) : '';
      const key = `${manufacturerNorm}|${modelNorm}`;
      
      // Keep first occurrence (or could choose to keep last)
      if (!uniqueRules.has(key)) {
        uniqueRules.set(key, rule);
      }
    }

    // Prepare insert data with normalized values
    const insertData = Array.from(uniqueRules.values()).map(rule => ({
      inventory_item_id: itemId,
      manufacturer: rule.manufacturer.trim(),
      model: rule.model?.trim() || null,
      manufacturer_norm: normalizeValue(rule.manufacturer),
      model_norm: rule.model ? normalizeValue(rule.model) : null
    }));

    const { error: insertError } = await supabase
      .from('part_compatibility_rules')
      .insert(insertData);

    if (insertError) {
      throw insertError;
    }

    return { rulesSet: insertData.length };
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
 * Used for displaying match count in the UI.
 * 
 * @param organizationId - Organization ID
 * @param rules - Array of rules to match against
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

    // Build OR conditions for each rule
    // This is a simplified approach - for complex queries, consider an RPC
    const { data: equipment, error } = await supabase
      .from('equipment')
      .select('id, manufacturer, model')
      .eq('organization_id', organizationId);

    if (error) throw error;

    if (!equipment || equipment.length === 0) {
      return 0;
    }

    // Normalize rules for matching
    const normalizedRules = validRules.map(rule => ({
      manufacturer: normalizeValue(rule.manufacturer),
      model: rule.model ? normalizeValue(rule.model) : null
    }));

    // Count equipment matching any rule
    const matchingIds = new Set<string>();
    for (const equip of equipment) {
      const equipMfr = normalizeValue(equip.manufacturer);
      const equipModel = normalizeValue(equip.model);

      for (const rule of normalizedRules) {
        if (rule.manufacturer === equipMfr) {
          // model = null means "any model"
          if (rule.model === null || rule.model === equipModel) {
            matchingIds.add(equip.id);
            break; // This equipment matches, no need to check more rules
          }
        }
      }
    }

    return matchingIds.size;
  } catch (error) {
    logger.error('Error counting equipment matching rules:', error);
    throw error;
  }
};
