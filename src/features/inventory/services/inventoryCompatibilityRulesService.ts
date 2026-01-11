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
 * Uses delete-then-insert pattern with recovery attempt on insert failure.
 * 
 * ## Atomicity Warning
 * The Supabase JS client doesn't support multi-statement transactions,
 * so this operation is not fully atomic. If insert fails after delete:
 * 1. We attempt to restore the original rules from a backup fetched before deletion.
 * 2. If recovery also fails, an error is thrown indicating data may be lost.
 * 
 * ## Recovery Guidance
 * If a user encounters a "recovery failed" error:
 * - The UI should prompt them to re-enter their compatibility rules.
 * - Consider implementing client-side localStorage backup for additional safety.
 * - For mission-critical deployments, migrate to an RPC function that uses
 *   PostgreSQL transactions for guaranteed atomicity.
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

    // Fetch existing rules as backup for recovery on insert failure
    const { data: existingRules, error: fetchError } = await supabase
      .from('part_compatibility_rules')
      .select('manufacturer, model, manufacturer_norm, model_norm')
      .eq('inventory_item_id', itemId);

    if (fetchError) {
      logger.warn('Could not fetch existing rules for backup:', fetchError);
      // Continue anyway - recovery won't be possible but operation can proceed
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
    // Design choice: Keep the first occurrence of each unique manufacturer/model pair.
    // This matches user expectation when adding rules in sequence - earlier entries take precedence.
    // The database unique constraint would reject duplicates anyway, so we dedupe client-side
    // to provide a clean user experience without validation errors.
    const uniqueRules = new Map<string, PartCompatibilityRuleFormData>();
    for (const rule of validRules) {
      const manufacturerNorm = normalizeValue(rule.manufacturer);
      const modelNorm = rule.model ? normalizeValue(rule.model) : '';
      const key = `${manufacturerNorm}|${modelNorm}`;
      
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
      // Attempt to restore original rules if we have a backup
      if (existingRules && existingRules.length > 0) {
        logger.warn('Insert failed, attempting to restore original rules...');
        const restoreData = existingRules.map(rule => ({
          inventory_item_id: itemId,
          manufacturer: rule.manufacturer,
          model: rule.model,
          manufacturer_norm: rule.manufacturer_norm,
          model_norm: rule.model_norm
        }));
        
        const { error: restoreError } = await supabase
          .from('part_compatibility_rules')
          .insert(restoreData);
        
        if (restoreError) {
          logger.error('Failed to restore original rules after insert failure:', restoreError);
          throw new Error(`Insert failed and recovery failed: ${insertError.message}. Original rules may be lost.`);
        }
        logger.info('Successfully restored original rules after insert failure');
      }
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
 * Used for displaying match count in the UI as users edit compatibility rules.
 * 
 * ## Performance Characteristics
 * 
 * **Current implementation**: Fetches all equipment from the organization to the
 * client and performs O(n*m) matching where n=equipment count and m=rules count.
 * 
 * **Acceptable for**:
 * - Typical fleet sizes (< 500 items)
 * - Real-time preview during rule editing
 * - Organizations that don't require sub-100ms response times
 * 
 * **Consider RPC migration for**:
 * - Large fleets (500+ items) where network transfer becomes significant
 * - Performance-critical deployments
 * - Organizations with many concurrent users editing rules
 * 
 * **Suggested RPC approach**: Create a PostgreSQL function that accepts the rules
 * array as JSON/JSONB, performs server-side matching using the same normalized
 * comparison logic, and returns just the count. This would:
 * - Reduce network payload from O(n) equipment rows to O(1) integer
 * - Leverage database indexes for faster matching
 * - Scale better as fleet sizes grow
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

    // Fetch equipment to client for matching
    // See function docstring for performance considerations and RPC migration path
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
