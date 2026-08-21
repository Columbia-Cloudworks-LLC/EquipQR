import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import type { 
  PMTemplateCompatibilityRule, 
  PMTemplateCompatibilityRuleFormData,
  MatchingPMTemplateResult 
} from '@/features/pm-templates/types/pmTemplateCompatibility';
import { assertPmTemplateAccessible } from '@/features/pm-templates/services/pmTemplateAccess';
import {
  filterValidCompatibilityRules,
  mapCompatibilityRulesToJsonb,
} from '@/services/compatibilityRulesJsonb';

// ============================================
// Get Compatibility Rules for Template
// ============================================

/**
 * Get all compatibility rules for a PM template within an organization.
 * 
 * Rules are organization-scoped, so this returns only the rules set by
 * the specified organization for the given template.
 * 
 * @param organizationId - Organization ID (rules are scoped to this org)
 * @param templateId - PM template ID
 * @returns Array of compatibility rules for this organization
 */
export const getRulesForTemplate = async (
  organizationId: string,
  templateId: string
): Promise<PMTemplateCompatibilityRule[]> => {
  try {
    await assertPmTemplateAccessible(organizationId, templateId);

    // Get rules for this organization and template
    const { data, error } = await supabase
      .from('pm_template_compatibility_rules')
      .select('*')
      .eq('pm_template_id', templateId)
      .eq('organization_id', organizationId)
      .order('manufacturer', { ascending: true })
      .order('model', { ascending: true, nullsFirst: false });

    if (error) throw error;

    return (data || []) as PMTemplateCompatibilityRule[];
  } catch (error) {
    logger.error('Error fetching compatibility rules for PM template:', error);
    throw error;
  }
};

// ============================================
// Bulk Set Compatibility Rules
// ============================================

/**
 * Replace all compatibility rules for a PM template within an organization.
 * Uses an atomic PostgreSQL RPC function for guaranteed transaction safety.
 * 
 * Rules are organization-scoped, so this replaces only the rules for the
 * specified organization. Other organizations' rules are not affected.
 * Works for both global and org-owned templates.
 * 
 * @param organizationId - Organization ID (rules are scoped to this org)
 * @param templateId - PM template ID
 * @param rules - Array of rules to set (replaces existing for this org)
 * @returns Object with counts of rules set
 */
export const bulkSetRules = async (
  organizationId: string,
  templateId: string,
  rules: PMTemplateCompatibilityRuleFormData[]
): Promise<{ rulesSet: number }> => {
  try {
    const validRules = filterValidCompatibilityRules(rules);
    const rulesJsonb = mapCompatibilityRulesToJsonb(validRules);

    // Call the atomic RPC function
    const { data, error } = await supabase.rpc('bulk_set_pm_template_rules', {
      p_organization_id: organizationId,
      p_template_id: templateId,
      p_rules: rulesJsonb
    });

    if (error) {
      // Handle permission errors with user-friendly message
      if (error.code === '42501') {
        throw new Error('PM template not found or access denied');
      }
      throw error;
    }

    return { rulesSet: data ?? 0 };
  } catch (error) {
    logger.error('Error bulk setting PM template compatibility rules:', error);
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
 * @param organizationId - Organization ID
 * @param rules - Array of rules to match against
 * @returns Count of matching equipment
 */
export const countEquipmentMatchingRules = async (
  organizationId: string,
  rules: PMTemplateCompatibilityRuleFormData[]
): Promise<number> => {
  try {
    const validRules = filterValidCompatibilityRules(rules);

    if (validRules.length === 0) {
      return 0;
    }

    const rulesJsonb = mapCompatibilityRulesToJsonb(validRules);

    // Call the server-side RPC function for efficient counting
    const { data, error } = await supabase.rpc('count_equipment_matching_pm_rules', {
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
    logger.error('Error counting equipment matching PM template rules:', error);
    throw error;
  }
};

// ============================================
// Get Matching Templates for Equipment
// ============================================

/**
 * Get PM templates that match a given equipment based on compatibility rules.
 * 
 * @param organizationId - Organization ID
 * @param equipmentId - Equipment ID to match against
 * @returns Array of matching templates with match info
 */
export const getMatchingTemplatesForEquipment = async (
  organizationId: string,
  equipmentId: string
): Promise<MatchingPMTemplateResult[]> => {
  try {
    const { data, error } = await supabase.rpc('get_matching_pm_templates', {
      p_organization_id: organizationId,
      p_equipment_id: equipmentId
    });

    if (error) {
      // Handle permission errors
      if (error.code === '42501') {
        throw new Error('Access denied');
      }
      throw error;
    }

    return (data || []) as MatchingPMTemplateResult[];
  } catch (error) {
    logger.error('Error getting matching PM templates for equipment:', error);
    throw error;
  }
};
