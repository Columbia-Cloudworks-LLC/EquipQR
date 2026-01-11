-- Migration: Add PM Template Compatibility Rules
-- Description: Creates rule-based PM template-to-equipment matching by manufacturer/model
-- Date: 2026-01-11
-- 
-- This feature allows PM templates to define which equipment types they apply to,
-- similar to inventory part compatibility rules. Templates can specify manufacturer/model
-- patterns and matching templates will be suggested when creating PM work orders.

BEGIN;

-- ============================================================================
-- PART 1: Create pm_template_compatibility_rules table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pm_template_compatibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pm_template_id UUID NOT NULL REFERENCES public.pm_checklist_templates(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Raw values (for display in UI)
  manufacturer TEXT NOT NULL,
  model TEXT,  -- NULL means "any model from this manufacturer"
  
  -- Normalized values for case-insensitive + trimmed exact matching
  manufacturer_norm TEXT NOT NULL,
  model_norm TEXT,  -- NULL means "any model"
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate rules per organization (same manufacturer/model after normalization)
  CONSTRAINT pm_template_compat_rules_unique UNIQUE (pm_template_id, organization_id, manufacturer_norm, model_norm)
);

-- Add comment for documentation
COMMENT ON TABLE public.pm_template_compatibility_rules IS 
  'Defines rule-based compatibility between PM templates and equipment by manufacturer/model patterns. '
  'NULL model means "any model from this manufacturer". Templates with matching rules are suggested '
  'when creating PM work orders for equipment.';

-- ============================================================================
-- PART 2: Create indexes for performance
-- ============================================================================

-- Index for looking up rules by PM template (form editing)
CREATE INDEX IF NOT EXISTS idx_pm_template_compat_rules_template 
  ON public.pm_template_compatibility_rules(pm_template_id);

-- Index for looking up rules by organization
CREATE INDEX IF NOT EXISTS idx_pm_template_compat_rules_org 
  ON public.pm_template_compatibility_rules(organization_id);

-- Index for matching equipment to rules (work order template picker)
CREATE INDEX IF NOT EXISTS idx_pm_template_compat_rules_mfr_model_norm 
  ON public.pm_template_compatibility_rules(organization_id, manufacturer_norm, model_norm);

-- Partial index for "any model" rules (WHERE model_norm IS NULL)
CREATE INDEX IF NOT EXISTS idx_pm_template_compat_rules_mfr_any_model 
  ON public.pm_template_compatibility_rules(organization_id, manufacturer_norm) 
  WHERE model_norm IS NULL;

-- ============================================================================
-- PART 3: Enable RLS and create policies
-- ============================================================================

ALTER TABLE public.pm_template_compatibility_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view rules belonging to their organization
-- Rules are organization-scoped, so check the rule's organization_id directly
CREATE POLICY "pm_template_compat_rules_select" ON public.pm_template_compatibility_rules
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid()
    AND status = 'active'
  )
);

-- Policy: Users can insert rules for their own organization
CREATE POLICY "pm_template_compat_rules_insert" ON public.pm_template_compatibility_rules
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid()
    AND status = 'active'
  )
);

-- Policy: Users can update rules belonging to their organization
CREATE POLICY "pm_template_compat_rules_update" ON public.pm_template_compatibility_rules
FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid()
    AND status = 'active'
  )
);

-- Policy: Users can delete rules belonging to their organization
CREATE POLICY "pm_template_compat_rules_delete" ON public.pm_template_compatibility_rules
FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid()
    AND status = 'active'
  )
);

-- ============================================================================
-- PART 4: RPC Function for Atomic Bulk Set of PM Template Rules
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

  -- Verify the PM template belongs to the specified organization and is not protected
  IF NOT EXISTS (
    SELECT 1 FROM public.pm_checklist_templates
    WHERE id = p_template_id
      AND organization_id = p_organization_id
      AND is_protected = false
  ) THEN
    RAISE EXCEPTION 'PM template not found, access denied, or template is protected'
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

GRANT EXECUTE ON FUNCTION public.bulk_set_pm_template_rules(UUID, UUID, JSONB) TO authenticated;

COMMENT ON FUNCTION public.bulk_set_pm_template_rules IS 
  'Atomically replaces all compatibility rules for a PM template. '
  'Uses a single transaction to ensure delete and insert are atomic. '
  'Only works for org-owned, non-protected templates.';

-- ============================================================================
-- PART 5: RPC Function for Server-Side Equipment Match Counting (PM Templates)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.count_equipment_matching_pm_rules(
  p_organization_id UUID,
  p_rules JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
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

  -- Return 0 if no rules provided
  IF p_rules IS NULL OR jsonb_array_length(p_rules) = 0 THEN
    RETURN 0;
  END IF;

  -- Count distinct equipment matching any rule
  SELECT COUNT(DISTINCT e.id)
  INTO v_count
  FROM public.equipment e
  WHERE e.organization_id = p_organization_id
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_rules) AS r
      WHERE 
        lower(trim(e.manufacturer)) = lower(trim(r->>'manufacturer'))
        AND (
          r->>'model' IS NULL 
          OR trim(r->>'model') = ''
          OR lower(trim(e.model)) = lower(trim(r->>'model'))
        )
    );

  RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_equipment_matching_pm_rules(UUID, JSONB) TO authenticated;

COMMENT ON FUNCTION public.count_equipment_matching_pm_rules IS 
  'Counts equipment matching the given PM template compatibility rules server-side. '
  'More efficient than client-side O(n*m) matching for large fleets.';

-- ============================================================================
-- PART 6: RPC Function for Getting Matching PM Templates for Equipment
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
  -- Get templates with matching rules for this organization
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
    -- Template must be accessible (global or org-owned)
    (t.organization_id IS NULL OR t.organization_id = p_organization_id)
    -- Rule must belong to requesting organization
    AND pcr.organization_id = p_organization_id
    -- Rule must match the equipment's manufacturer/model
    AND pcr.manufacturer_norm = v_equipment_manufacturer_norm
    AND (pcr.model_norm IS NULL OR pcr.model_norm = v_equipment_model_norm)
  -- Order by match specificity (model match first, then manufacturer-only)
  ORDER BY t.id, 
    CASE WHEN pcr.model_norm IS NOT NULL THEN 0 ELSE 1 END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_matching_pm_templates(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.get_matching_pm_templates IS 
  'Returns PM templates that match the given equipment based on manufacturer/model compatibility rules. '
  'Results include match type (model = specific match, manufacturer = any model match) and are '
  'ordered by match specificity.';

COMMIT;
