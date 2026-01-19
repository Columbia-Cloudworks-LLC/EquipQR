-- Migration: Fix bulk_set_compatibility_rules for partial unique indexes
-- 
-- Problem: The function uses ON CONFLICT (inventory_item_id, manufacturer_norm, model_norm)
-- but the table has PARTIAL unique indexes, not a regular unique constraint.
-- PostgreSQL's ON CONFLICT cannot reference partial indexes this way.
--
-- Solution: Use NOT EXISTS pattern instead of ON CONFLICT, matching the approach
-- from migration 20260111000003_fix_bulk_set_compatibility_rules_conflict.sql
-- but updated to support the new pattern matching columns.

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
        
        -- Insert using NOT EXISTS to handle duplicates with partial unique indexes
        -- This avoids the ON CONFLICT issue with partial indexes
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
        )
        SELECT
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
        WHERE NOT EXISTS (
          SELECT 1 FROM public.part_compatibility_rules pcr
          WHERE pcr.inventory_item_id = p_item_id
            AND pcr.manufacturer_norm = v_manufacturer_norm
            AND (
              -- Match NULL = NULL (any model rules)
              (pcr.model_norm IS NULL AND v_model_norm IS NULL)
              OR
              -- Match exact model values
              (pcr.model_norm = v_model_norm)
            )
        );
        
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
  'Uses NOT EXISTS pattern to work with partial unique indexes. '
  'Uses a single transaction to ensure delete and insert are atomic.';
