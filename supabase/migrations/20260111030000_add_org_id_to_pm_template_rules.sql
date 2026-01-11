-- Migration: Add organization_id to PM Template Compatibility Rules
-- Description: Enables org-specific rules for both global and org-owned templates
-- Date: 2026-01-11
--
-- Previously, rules were template-level only. This change allows each organization
-- to define their own compatibility rules for any template (including global templates).
-- This is essential for multi-tenant scenarios where different organizations may use
-- the same global template for different equipment types.

BEGIN;

-- ============================================================================
-- PART 1: Add organization_id column
-- ============================================================================

-- Add the column as nullable first (for existing data migration)
ALTER TABLE public.pm_template_compatibility_rules 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- For existing rules, set organization_id from the template's organization_id
-- (Only org-owned templates could have rules before this migration)
UPDATE public.pm_template_compatibility_rules pcr
SET organization_id = (
  SELECT pct.organization_id 
  FROM public.pm_checklist_templates pct 
  WHERE pct.id = pcr.pm_template_id
)
WHERE pcr.organization_id IS NULL;

-- Delete any rules where organization_id is still NULL after migration.
-- This is intentional: in the new design, rules are organization-scoped.
-- Rules for global templates (organization_id IS NULL on template) cannot be 
-- auto-migrated because they don't belong to any specific organization.
-- Organizations can recreate their rules for global templates after migration.
DELETE FROM public.pm_template_compatibility_rules 
WHERE organization_id IS NULL;

-- Now make the column NOT NULL
ALTER TABLE public.pm_template_compatibility_rules 
ALTER COLUMN organization_id SET NOT NULL;

-- ============================================================================
-- PART 2: Update unique constraint to include organization_id
-- ============================================================================

-- Drop the old constraint
ALTER TABLE public.pm_template_compatibility_rules 
DROP CONSTRAINT IF EXISTS pm_template_compat_rules_unique;

-- Add new constraint that includes organization_id
-- This allows different organizations to have different rules for the same template
ALTER TABLE public.pm_template_compatibility_rules 
ADD CONSTRAINT pm_template_compat_rules_unique 
UNIQUE (pm_template_id, organization_id, manufacturer_norm, model_norm);

-- ============================================================================
-- PART 3: Update indexes to include organization_id
-- ============================================================================

-- Add organization-only index
CREATE INDEX IF NOT EXISTS idx_pm_template_compat_rules_org 
  ON public.pm_template_compatibility_rules(organization_id);

-- Composite index for common query pattern (org + template)
CREATE INDEX IF NOT EXISTS idx_pm_template_compat_rules_org_template 
  ON public.pm_template_compatibility_rules(organization_id, pm_template_id);

-- Drop and recreate matching indexes to include organization_id for better query performance
DROP INDEX IF EXISTS idx_pm_template_compat_rules_mfr_model_norm;
CREATE INDEX idx_pm_template_compat_rules_mfr_model_norm 
  ON public.pm_template_compatibility_rules(organization_id, manufacturer_norm, model_norm);

-- Drop and recreate the "any model" partial index to include organization_id
DROP INDEX IF EXISTS idx_pm_template_compat_rules_mfr_any_model;
CREATE INDEX idx_pm_template_compat_rules_mfr_any_model 
  ON public.pm_template_compatibility_rules(organization_id, manufacturer_norm) 
  WHERE model_norm IS NULL;

-- ============================================================================
-- PART 4: Drop and recreate RLS policies
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "pm_template_compat_rules_select" ON public.pm_template_compatibility_rules;
DROP POLICY IF EXISTS "pm_template_compat_rules_insert" ON public.pm_template_compatibility_rules;
DROP POLICY IF EXISTS "pm_template_compat_rules_update" ON public.pm_template_compatibility_rules;
DROP POLICY IF EXISTS "pm_template_compat_rules_delete" ON public.pm_template_compatibility_rules;

-- New SELECT policy: Users can view rules for their organization
CREATE POLICY "pm_template_compat_rules_select" ON public.pm_template_compatibility_rules
FOR SELECT USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND om.status = 'active'
  )
);

-- New INSERT policy: Users can insert rules for templates they can access
-- (global templates or org-owned templates in their organization)
CREATE POLICY "pm_template_compat_rules_insert" ON public.pm_template_compatibility_rules
FOR INSERT WITH CHECK (
  -- Must be for user's organization
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND om.status = 'active'
  )
  -- Template must be accessible (global or org-owned)
  AND pm_template_id IN (
    SELECT id FROM public.pm_checklist_templates 
    WHERE organization_id IS NULL  -- Global templates
       OR organization_id IN (
         SELECT om.organization_id FROM public.organization_members om
         WHERE om.user_id = auth.uid()
         AND om.status = 'active'
       )
  )
);

-- New UPDATE policy: Users can update rules in their organization
CREATE POLICY "pm_template_compat_rules_update" ON public.pm_template_compatibility_rules
FOR UPDATE USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND om.status = 'active'
  )
);

-- New DELETE policy: Users can delete rules in their organization
CREATE POLICY "pm_template_compat_rules_delete" ON public.pm_template_compatibility_rules
FOR DELETE USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND om.status = 'active'
  )
);

-- ============================================================================
-- PART 5: Update bulk_set_pm_template_rules RPC function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.bulk_set_pm_template_rules(
  p_organization_id UUID,
  p_template_id UUID,
  p_rules JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_rules_count INTEGER := 0;
  v_rule JSONB;
  v_manufacturer TEXT;
  v_model TEXT;
  v_manufacturer_norm TEXT;
  v_model_norm TEXT;
BEGIN
  -- Security check: Verify authenticated context exists
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required: no authenticated user context'
      USING ERRCODE = '42501';
  END IF;

  -- Security check: Verify the calling user is an active member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: user is not an active member of the organization'
      USING ERRCODE = '42501';
  END IF;

  -- Verify the PM template is accessible (global or org-owned)
  IF NOT EXISTS (
    SELECT 1 FROM public.pm_checklist_templates
    WHERE id = p_template_id
      AND (organization_id IS NULL OR organization_id = p_organization_id)
  ) THEN
    RAISE EXCEPTION 'PM template not found or access denied'
      USING ERRCODE = '42501';
  END IF;

  -- Delete all existing rules for this template AND organization (within the transaction)
  DELETE FROM public.pm_template_compatibility_rules
  WHERE pm_template_id = p_template_id
    AND organization_id = p_organization_id;

  -- Insert new rules from the JSONB array
  -- If this fails, the entire transaction (including the delete) rolls back
  IF p_rules IS NOT NULL AND jsonb_array_length(p_rules) > 0 THEN
    FOR v_rule IN SELECT * FROM jsonb_array_elements(p_rules)
    LOOP
      v_manufacturer := v_rule->>'manufacturer';
      v_model := v_rule->>'model';
      
      -- Skip rules with empty manufacturer
      IF v_manufacturer IS NOT NULL AND trim(v_manufacturer) <> '' THEN
        v_manufacturer_norm := lower(trim(v_manufacturer));
        v_model_norm := CASE 
          WHEN v_model IS NOT NULL AND trim(v_model) <> '' THEN lower(trim(v_model))
          ELSE NULL
        END;
        
        -- Insert with ON CONFLICT DO NOTHING to handle duplicates silently
        INSERT INTO public.pm_template_compatibility_rules (
          pm_template_id,
          organization_id,
          manufacturer,
          model,
          manufacturer_norm,
          model_norm
        ) VALUES (
          p_template_id,
          p_organization_id,
          trim(v_manufacturer),
          CASE WHEN v_model IS NOT NULL AND trim(v_model) <> '' THEN trim(v_model) ELSE NULL END,
          v_manufacturer_norm,
          v_model_norm
        )
        ON CONFLICT (pm_template_id, organization_id, manufacturer_norm, model_norm) DO NOTHING;
        
        -- Only count if actually inserted (no conflict)
        IF FOUND THEN
          v_rules_count := v_rules_count + 1;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN v_rules_count;
END;
$$;

COMMENT ON FUNCTION public.bulk_set_pm_template_rules IS 
  'Atomically replaces all compatibility rules for a PM template within an organization. '
  'Uses a single transaction to ensure delete and insert are atomic. '
  'Works for both global templates and org-owned templates.';

-- ============================================================================
-- PART 6: Update get_matching_pm_templates RPC function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_matching_pm_templates(
  p_organization_id UUID,
  p_equipment_id UUID
)
RETURNS TABLE (
  template_id UUID,
  template_name TEXT,
  template_description TEXT,
  is_protected BOOLEAN,
  template_organization_id UUID,
  match_type TEXT,  -- 'model' (specific match) or 'manufacturer' (any model match)
  matched_manufacturer TEXT,
  matched_model TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_equipment_manufacturer TEXT;
  v_equipment_model TEXT;
  v_equipment_manufacturer_norm TEXT;
  v_equipment_model_norm TEXT;
BEGIN
  -- Security check: Verify authenticated context exists
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required: no authenticated user context'
      USING ERRCODE = '42501';
  END IF;

  -- Security check: Verify the calling user is an active member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: user is not an active member of the organization'
      USING ERRCODE = '42501';
  END IF;

  -- Get equipment manufacturer and model
  SELECT e.manufacturer, e.model,
         lower(trim(e.manufacturer)), lower(trim(e.model))
  INTO v_equipment_manufacturer, v_equipment_model,
       v_equipment_manufacturer_norm, v_equipment_model_norm
  FROM public.equipment e
  WHERE e.id = p_equipment_id
    AND e.organization_id = p_organization_id;

  -- Return empty if equipment not found
  IF v_equipment_manufacturer IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  -- Get templates with matching rules FOR THIS ORGANIZATION
  SELECT DISTINCT ON (t.id)
    t.id AS template_id,
    t.name AS template_name,
    t.description AS template_description,
    t.is_protected,
    t.organization_id AS template_organization_id,
    CASE 
      WHEN pcr.model_norm IS NOT NULL THEN 'model'::TEXT
      ELSE 'manufacturer'::TEXT
    END AS match_type,
    pcr.manufacturer AS matched_manufacturer,
    pcr.model AS matched_model
  FROM public.pm_checklist_templates t
  JOIN public.pm_template_compatibility_rules pcr ON pcr.pm_template_id = t.id
  WHERE 
    -- Rules must be for this organization
    pcr.organization_id = p_organization_id
    -- Template must be accessible (global or org-owned)
    AND (t.organization_id IS NULL OR t.organization_id = p_organization_id)
    -- Rule must match the equipment
    AND pcr.manufacturer_norm = v_equipment_manufacturer_norm
    AND (pcr.model_norm IS NULL OR pcr.model_norm = v_equipment_model_norm)
  -- Order by match specificity (model match first, then manufacturer-only)
  ORDER BY t.id, 
    CASE WHEN pcr.model_norm IS NOT NULL THEN 0 ELSE 1 END;
END;
$$;

COMMENT ON FUNCTION public.get_matching_pm_templates IS 
  'Returns PM templates that match the given equipment based on the organizations compatibility rules. '
  'Results include match type (model = specific match, manufacturer = any model match) and are '
  'ordered by match specificity. Only returns rules set by the calling organization.';

-- Update table comment
COMMENT ON TABLE public.pm_template_compatibility_rules IS 
  'Defines organization-specific compatibility rules between PM templates and equipment. '
  'Each organization can set their own rules for any template (including global templates). '
  'NULL model means "any model from this manufacturer".';

COMMIT;
