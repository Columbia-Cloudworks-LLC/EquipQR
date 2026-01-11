/**
 * PM Template Compatibility Types
 * 
 * Types for rule-based matching of PM templates to equipment by manufacturer/model.
 * Similar to inventory part compatibility rules.
 */

// ============================================
// Base Rule Types
// ============================================

/**
 * PMTemplateCompatibilityRule - Rule-based matching of PM templates to equipment.
 * 
 * Allows defining compatibility patterns like "fits all Caterpillar D6T equipment"
 * instead of manually linking to specific equipment records.
 * 
 * Rules are organization-scoped, allowing each organization to set their own
 * compatibility rules for any template (including global templates).
 */
export interface PMTemplateCompatibilityRule {
  id: string;
  pm_template_id: string;
  organization_id: string;  // Organization that owns this rule
  manufacturer: string;
  model: string | null;  // null = "any model from this manufacturer"
  manufacturer_norm: string;
  model_norm: string | null;
  created_at: string;
}

/**
 * PMTemplateCompatibilityRuleFormData - Form input for creating/editing compatibility rules.
 * 
 * Uses raw values; normalization happens on save.
 */
export interface PMTemplateCompatibilityRuleFormData {
  manufacturer: string;
  model: string | null;  // null or empty string = "Any Model"
}

// ============================================
// RPC Result Types
// ============================================

/**
 * MatchingPMTemplateResult - Result from get_matching_pm_templates RPC.
 * 
 * Includes match_type to indicate how the template was matched:
 * - 'model': Specific model match (highest priority)
 * - 'manufacturer': Any model from manufacturer match
 */
export interface MatchingPMTemplateResult {
  template_id: string;
  template_name: string;
  template_description: string | null;
  is_protected: boolean;
  template_organization_id: string | null;  // Column originally named `organization_id`; aliased to `template_organization_id` in the get_matching_pm_templates PL/pgSQL function to avoid clashing with a function parameter also named `organization_id`.
  match_type: 'model' | 'manufacturer';
  matched_manufacturer: string;
  matched_model: string | null;
}

/**
 * PMTemplateWithMatchInfo - Extended template info with match context.
 * 
 * Used in UI to display matching templates with their match reason.
 */
export interface PMTemplateWithMatchInfo {
  id: string;
  name: string;
  description: string | null;
  isProtected: boolean;
  organizationId: string | null;
  matchType: 'model' | 'manufacturer' | 'direct' | 'none';
  matchReason?: string;  // Human-readable match reason
}
