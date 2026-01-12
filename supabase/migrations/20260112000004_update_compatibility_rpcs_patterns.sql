-- Migration: Update Compatibility RPCs for Pattern Matching
-- Description: Updates existing RPCs and adds new ones for pattern-based and ad-hoc matching
-- Date: 2026-01-12
-- Purpose: Support PREFIX/WILDCARD rules and make/model lookup without equipment records

BEGIN;

-- ============================================================================
-- PART 1: Update count_equipment_matching_rules to support pattern matching
-- ============================================================================

-- Drop and recreate with new signature that includes match_type
CREATE OR REPLACE FUNCTION public.count_equipment_matching_rules(
  p_organization_id UUID,
  p_rules JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
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
  -- Each rule has: manufacturer (required), model (optional), match_type (optional, defaults to 'exact')
  -- match_type can be: 'any', 'exact', 'prefix', 'wildcard'
  SELECT COUNT(DISTINCT e.id)
  INTO v_count
  FROM public.equipment e
  WHERE e.organization_id = p_organization_id
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_rules) AS r
      WHERE 
        -- Manufacturer must match (case-insensitive, trimmed)
        lower(trim(e.manufacturer)) = lower(trim(r->>'manufacturer'))
        -- Model matching based on match_type
        AND (
          -- ANY: match any model
          COALESCE(r->>'match_type', 'exact') = 'any'
          OR r->>'model' IS NULL 
          OR trim(r->>'model') = ''
          
          -- EXACT: model must match exactly
          OR (
            COALESCE(r->>'match_type', 'exact') = 'exact'
            AND lower(trim(e.model)) = lower(trim(r->>'model'))
          )
          
          -- PREFIX: model starts with pattern
          OR (
            r->>'match_type' = 'prefix'
            AND lower(trim(e.model)) LIKE (lower(trim(r->>'model')) || '%')
          )
          
          -- WILDCARD: model matches pattern (already converted: * → %, ? → _)
          OR (
            r->>'match_type' = 'wildcard'
            AND lower(trim(e.model)) LIKE lower(trim(r->>'model'))
          )
        )
    );

  RETURN COALESCE(v_count, 0);
END;
$$;

COMMENT ON FUNCTION public.count_equipment_matching_rules IS 
  'Counts equipment matching the given compatibility rules server-side. '
  'Supports match_type: any, exact (default), prefix, wildcard. '
  'Rules format: [{manufacturer: string, model: string|null, match_type?: string}, ...].';


-- ============================================================================
-- PART 2: Update bulk_set_compatibility_rules to support pattern matching
-- ============================================================================

CREATE OR REPLACE FUNCTION public.bulk_set_compatibility_rules(
  p_organization_id UUID,
  p_item_id UUID,
  p_rules JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_rules_count INTEGER := 0;
  v_rule JSONB;
  v_manufacturer TEXT;
  v_model TEXT;
  v_manufacturer_norm TEXT;
  v_model_norm TEXT;
  v_match_type public.model_match_type;
  v_pattern_raw TEXT;
  v_pattern_norm TEXT;
  v_status public.verification_status;
  v_notes TEXT;
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

  -- Verify the inventory item belongs to the specified organization
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_items
    WHERE id = p_item_id
      AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Inventory item not found or access denied'
      USING ERRCODE = '42501';
  END IF;

  -- Delete all existing rules for this item (within the transaction)
  DELETE FROM public.part_compatibility_rules
  WHERE inventory_item_id = p_item_id;

  -- Insert new rules from the JSONB array
  IF p_rules IS NOT NULL AND jsonb_array_length(p_rules) > 0 THEN
    FOR v_rule IN SELECT * FROM jsonb_array_elements(p_rules)
    LOOP
      v_manufacturer := v_rule->>'manufacturer';
      v_model := v_rule->>'model';
      
      -- Skip rules with empty manufacturer
      IF v_manufacturer IS NOT NULL AND trim(v_manufacturer) <> '' THEN
        v_manufacturer_norm := lower(trim(v_manufacturer));
        
        -- Parse match_type (default to 'exact', or 'any' if model is null/empty)
        BEGIN
          v_match_type := COALESCE(
            (v_rule->>'match_type')::public.model_match_type,
            CASE 
              WHEN v_model IS NULL OR trim(v_model) = '' THEN 'any'::public.model_match_type
              ELSE 'exact'::public.model_match_type
            END
          );
        EXCEPTION WHEN invalid_text_representation THEN
          v_match_type := 'exact'::public.model_match_type;
        END;
        
        -- Set model_norm and pattern based on match_type
        CASE v_match_type
          WHEN 'any' THEN
            v_model_norm := NULL;
            v_pattern_raw := NULL;
            v_pattern_norm := NULL;
            
          WHEN 'exact' THEN
            v_model_norm := CASE 
              WHEN v_model IS NOT NULL AND trim(v_model) <> '' THEN lower(trim(v_model))
              ELSE NULL
            END;
            v_pattern_raw := NULL;
            v_pattern_norm := NULL;
            -- If model is null/empty for 'exact', treat as 'any'
            IF v_model_norm IS NULL THEN
              v_match_type := 'any'::public.model_match_type;
            END IF;
            
          WHEN 'prefix' THEN
            v_model_norm := NULL;  -- Not used for prefix matching
            v_pattern_raw := trim(v_model);
            v_pattern_norm := public.normalize_compatibility_pattern('prefix', v_model);
            
          WHEN 'wildcard' THEN
            v_model_norm := NULL;  -- Not used for wildcard matching
            v_pattern_raw := trim(v_model);
            v_pattern_norm := public.normalize_compatibility_pattern('wildcard', v_model);
        END CASE;
        
        -- Parse optional status and notes
        BEGIN
          v_status := COALESCE((v_rule->>'status')::public.verification_status, 'unverified'::public.verification_status);
        EXCEPTION WHEN invalid_text_representation THEN
          v_status := 'unverified'::public.verification_status;
        END;
        v_notes := v_rule->>'notes';
        
        -- Insert with ON CONFLICT DO NOTHING to handle duplicates silently
        INSERT INTO public.part_compatibility_rules (
          inventory_item_id,
          manufacturer,
          model,
          manufacturer_norm,
          model_norm,
          match_type,
          model_pattern_raw,
          model_pattern_norm,
          status,
          notes,
          created_by
        ) VALUES (
          p_item_id,
          trim(v_manufacturer),
          CASE WHEN v_model IS NOT NULL AND trim(v_model) <> '' THEN trim(v_model) ELSE NULL END,
          v_manufacturer_norm,
          v_model_norm,
          v_match_type,
          v_pattern_raw,
          v_pattern_norm,
          v_status,
          v_notes,
          auth.uid()
        )
        ON CONFLICT (inventory_item_id, manufacturer_norm, model_norm) DO NOTHING;
        
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

COMMENT ON FUNCTION public.bulk_set_compatibility_rules IS 
  'Atomically replaces all compatibility rules for an inventory item. '
  'Supports match_type: any, exact, prefix, wildcard. '
  'Uses a single transaction to ensure delete and insert are atomic.';


-- ============================================================================
-- PART 3: Update get_compatible_parts_for_equipment to support patterns
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_compatible_parts_for_equipment(
  p_organization_id UUID,
  p_equipment_ids UUID[]
)
RETURNS TABLE (
  inventory_item_id UUID,
  name TEXT,
  sku TEXT,
  external_id TEXT,
  quantity_on_hand INTEGER,
  low_stock_threshold INTEGER,
  default_unit_cost NUMERIC,
  location TEXT,
  image_url TEXT,
  match_type TEXT
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Return empty if no equipment IDs provided
  IF p_equipment_ids IS NULL OR array_length(p_equipment_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  -- Direct links (org-safe by joining inventory_items and filtering organization_id)
  SELECT
    ii.id AS inventory_item_id,
    ii.name,
    ii.sku,
    ii.external_id,
    ii.quantity_on_hand,
    ii.low_stock_threshold,
    ii.default_unit_cost,
    ii.location,
    ii.image_url,
    'direct'::TEXT AS match_type
  FROM public.equipment_part_compatibility epc
  JOIN public.inventory_items ii ON ii.id = epc.inventory_item_id
  WHERE epc.equipment_id = ANY(p_equipment_ids)
    AND ii.organization_id = p_organization_id

  UNION

  -- Rule-based matches (with pattern support)
  SELECT
    ii.id AS inventory_item_id,
    ii.name,
    ii.sku,
    ii.external_id,
    ii.quantity_on_hand,
    ii.low_stock_threshold,
    ii.default_unit_cost,
    ii.location,
    ii.image_url,
    'rule'::TEXT AS match_type
  FROM public.equipment e
  JOIN public.part_compatibility_rules pcr
    ON pcr.manufacturer_norm = lower(trim(e.manufacturer))
    AND (
      -- ANY: match any model
      pcr.match_type = 'any'
      
      -- EXACT: model must match exactly
      OR (pcr.match_type = 'exact' AND pcr.model_norm = lower(trim(e.model)))
      
      -- PREFIX: model starts with pattern
      OR (pcr.match_type = 'prefix' AND lower(trim(e.model)) LIKE (pcr.model_pattern_norm || '%'))
      
      -- WILDCARD: model matches pattern
      OR (pcr.match_type = 'wildcard' AND lower(trim(e.model)) LIKE pcr.model_pattern_norm)
      
      -- Legacy: NULL model_norm means any model (backwards compat)
      OR (pcr.model_norm IS NULL AND pcr.match_type = 'exact')
    )
  JOIN public.inventory_items ii ON ii.id = pcr.inventory_item_id
    AND ii.organization_id = p_organization_id
  WHERE e.id = ANY(p_equipment_ids)
    AND e.organization_id = p_organization_id;
END;
$$;

COMMENT ON FUNCTION public.get_compatible_parts_for_equipment IS 
  'Returns compatible inventory items for given equipment IDs. '
  'Combines direct links with rule-based matches including pattern matching.';


-- ============================================================================
-- PART 4: NEW - get_compatible_parts_for_make_model (no equipment record needed)
-- ============================================================================

-- This is the key new function that allows lookup without an equipment record
-- Tech can enter manufacturer + model and get compatible parts

CREATE OR REPLACE FUNCTION public.get_compatible_parts_for_make_model(
  p_organization_id UUID,
  p_manufacturer TEXT,
  p_model TEXT DEFAULT NULL
)
RETURNS TABLE (
  inventory_item_id UUID,
  name TEXT,
  sku TEXT,
  external_id TEXT,
  quantity_on_hand INTEGER,
  low_stock_threshold INTEGER,
  default_unit_cost NUMERIC,
  location TEXT,
  image_url TEXT,
  match_type TEXT,
  rule_match_type public.model_match_type,
  rule_status public.verification_status,
  is_in_stock BOOLEAN,
  is_verified BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_mfr_norm TEXT;
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

  -- Normalize inputs
  v_mfr_norm := lower(trim(COALESCE(p_manufacturer, '')));
  v_model_norm := lower(trim(COALESCE(p_model, '')));
  
  -- Return empty if no manufacturer provided
  IF v_mfr_norm = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ii.id AS inventory_item_id,
    ii.name,
    ii.sku,
    ii.external_id,
    ii.quantity_on_hand,
    ii.low_stock_threshold,
    ii.default_unit_cost,
    ii.location,
    ii.image_url,
    'rule'::TEXT AS match_type,
    pcr.match_type AS rule_match_type,
    pcr.status AS rule_status,
    (ii.quantity_on_hand > 0) AS is_in_stock,
    (pcr.status = 'verified') AS is_verified
  FROM public.part_compatibility_rules pcr
  JOIN public.inventory_items ii ON ii.id = pcr.inventory_item_id
    AND ii.organization_id = p_organization_id
  WHERE pcr.manufacturer_norm = v_mfr_norm
    AND (
      -- ANY: match any model
      pcr.match_type = 'any'
      
      -- EXACT: model must match exactly (or no model provided = match all)
      OR (
        pcr.match_type = 'exact' 
        AND (v_model_norm = '' OR pcr.model_norm = v_model_norm)
      )
      
      -- PREFIX: model starts with pattern
      OR (
        pcr.match_type = 'prefix' 
        AND v_model_norm <> ''
        AND v_model_norm LIKE (pcr.model_pattern_norm || '%')
      )
      
      -- WILDCARD: model matches pattern
      OR (
        pcr.match_type = 'wildcard' 
        AND v_model_norm <> ''
        AND v_model_norm LIKE pcr.model_pattern_norm
      )
      
      -- Legacy: NULL model_norm means any model
      OR (pcr.model_norm IS NULL AND pcr.match_type = 'exact')
    )
  ORDER BY
    (pcr.status = 'verified') DESC,  -- Verified first
    (ii.quantity_on_hand > 0) DESC,  -- In-stock first
    ii.default_unit_cost ASC NULLS LAST,  -- Cheapest first
    ii.name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_compatible_parts_for_make_model(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_compatible_parts_for_make_model IS 
  'Returns compatible inventory items for a given manufacturer and optional model. '
  'Does NOT require an equipment record. Matches against part_compatibility_rules. '
  'Results sorted: verified first, in-stock first, cheapest first.';

COMMIT;
