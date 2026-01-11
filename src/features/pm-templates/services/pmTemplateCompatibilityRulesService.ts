import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import type { 
  PMTemplateCompatibilityRule, 
  PMTemplateCompatibilityRuleFormData,
  MatchingPMTemplateResult 
} from '@/features/pm-templates/types/pmTemplateCompatibility';

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
// Get Compatibility Rules for Template
// ============================================

/**
 * Get all compatibility rules for a PM template.
 * 
 * @param organizationId - Organization ID for access control
 * @param templateId - PM template ID
 * @returns Array of compatibility rules
 */
export const getRulesForTemplate = async (
  organizationId: string,
  templateId: string
): Promise<PMTemplateCompatibilityRule[]> => {
  try {
    // Verify template is accessible (org-owned or global)
    const { data: template, error: templateError } = await supabase
      .from('pm_checklist_templates')
      .select('id, organization_id')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      throw new Error('PM template not found or access denied');
    }

    // Check access: template must be global or belong to the organization
    if (template.organization_id !== null && template.organization_id !== organizationId) {
      throw new Error('PM template not found or access denied');
    }

    const { data, error } = await supabase
      .from('pm_template_compatibility_rules')
      .select('*')
      .eq('pm_template_id', templateId)
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
// Add Compatibility Rule
// ============================================

/**
 * Add a single compatibility rule for a PM template.
 * 
 * @param organizationId - Organization ID for access control
 * @param templateId - PM template ID
 * @param rule - Rule data (manufacturer, model)
 * @returns The created rule
 */
export const addRule = async (
  organizationId: string,
  templateId: string,
  rule: PMTemplateCompatibilityRuleFormData
): Promise<PMTemplateCompatibilityRule> => {
  try {
    // Verify template belongs to organization and is not protected
    const { data: template, error: templateError } = await supabase
      .from('pm_checklist_templates')
      .select('id, organization_id, is_protected')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      throw new Error('PM template not found or access denied');
    }

    if (template.organization_id !== organizationId) {
      throw new Error('PM template not found or access denied');
    }

    if (template.is_protected) {
      throw new Error('Cannot modify rules for protected templates');
    }

    // Normalize values for matching
    const manufacturerNorm = normalizeValue(rule.manufacturer);
    const modelNorm = rule.model ? normalizeValue(rule.model) : null;

    const { data, error } = await supabase
      .from('pm_template_compatibility_rules')
      .insert({
        pm_template_id: templateId,
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
        throw new Error('This manufacturer/model combination already exists for this template');
      }
      throw error;
    }

    return data as PMTemplateCompatibilityRule;
  } catch (error) {
    logger.error('Error adding PM template compatibility rule:', error);
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
export const removeRule = async (
  organizationId: string,
  ruleId: string
): Promise<void> => {
  try {
    // Verify rule belongs to a template in the organization and is not protected
    const { data: rule, error: ruleError } = await supabase
      .from('pm_template_compatibility_rules')
      .select(`
        id,
        pm_checklist_templates!inner(organization_id, is_protected)
      `)
      .eq('id', ruleId)
      .single();

    if (ruleError || !rule) {
      throw new Error('Compatibility rule not found or access denied');
    }

    // Type assertion for the joined data
    const ruleData = rule as { 
      id: string; 
      pm_checklist_templates: { organization_id: string | null; is_protected: boolean } 
    };
    
    if (ruleData.pm_checklist_templates.organization_id !== organizationId) {
      throw new Error('Compatibility rule not found or access denied');
    }

    if (ruleData.pm_checklist_templates.is_protected) {
      throw new Error('Cannot modify rules for protected templates');
    }

    const { error } = await supabase
      .from('pm_template_compatibility_rules')
      .delete()
      .eq('id', ruleId);

    if (error) throw error;
  } catch (error) {
    logger.error('Error removing PM template compatibility rule:', error);
    throw error;
  }
};

// ============================================
// Bulk Set Compatibility Rules
// ============================================

/**
 * Replace all compatibility rules for a PM template.
 * Uses an atomic PostgreSQL RPC function for guaranteed transaction safety.
 * 
 * @param organizationId - Organization ID for access control
 * @param templateId - PM template ID
 * @param rules - Array of rules to set (replaces existing)
 * @returns Object with counts of rules set
 */
export const bulkSetRules = async (
  organizationId: string,
  templateId: string,
  rules: PMTemplateCompatibilityRuleFormData[]
): Promise<{ rulesSet: number }> => {
  try {
    // Filter out rules with empty manufacturers (invalid/incomplete rules)
    const validRules = rules.filter(rule => rule.manufacturer.trim().length > 0);

    // Convert rules to JSONB format for the RPC function
    const rulesJsonb = validRules.map(rule => ({
      manufacturer: rule.manufacturer.trim(),
      model: rule.model?.trim() || null
    }));

    // Call the atomic RPC function
    const { data, error } = await supabase.rpc('bulk_set_pm_template_rules', {
      p_organization_id: organizationId,
      p_template_id: templateId,
      p_rules: rulesJsonb
    });

    if (error) {
      // Handle permission errors with user-friendly message
      if (error.code === '42501') {
        throw new Error('PM template not found, access denied, or template is protected');
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
    // Filter out invalid rules with empty manufacturers
    const validRules = rules.filter(rule => rule.manufacturer.trim().length > 0);
    
    if (validRules.length === 0) {
      return 0;
    }

    // Convert rules to JSONB format for the RPC function
    const rulesJsonb = validRules.map(rule => ({
      manufacturer: rule.manufacturer.trim(),
      model: rule.model?.trim() || null
    }));

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
