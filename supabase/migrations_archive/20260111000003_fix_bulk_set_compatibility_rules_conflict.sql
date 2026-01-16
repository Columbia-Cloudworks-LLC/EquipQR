-- Migration: Fix bulk_set_compatibility_rules ON CONFLICT issue
-- Description: Replaces ON CONFLICT clause with NOT EXISTS check to work with partial unique indexes
-- Date: 2026-01-11
-- Issue: The ON CONFLICT (columns) syntax cannot match partial unique indexes,
--        causing error 42P10 "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- Solution: Use INSERT ... WHERE NOT EXISTS to handle duplicates within the same batch

BEGIN;

-- ============================================================================
-- Replace the bulk_set_compatibility_rules function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.bulk_set_compatibility_rules(
  p_organization_id UUID,
  p_item_id UUID,
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
        
        -- Insert only if this exact combination doesn't already exist in this batch
        -- Uses NOT EXISTS to avoid ON CONFLICT issues with partial unique indexes
        INSERT INTO public.part_compatibility_rules (
          inventory_item_id,
          manufacturer,
          model,
          manufacturer_norm,
          model_norm
        )
        SELECT
          p_item_id,
          trim(v_manufacturer),
          CASE WHEN v_model IS NOT NULL AND trim(v_model) <> '' THEN trim(v_model) ELSE NULL END,
          v_manufacturer_norm,
          v_model_norm
        WHERE NOT EXISTS (
          SELECT 1 FROM public.part_compatibility_rules pcr
          WHERE pcr.inventory_item_id = p_item_id
            AND pcr.manufacturer_norm = v_manufacturer_norm
            AND (
              -- Handle NULL comparison: both NULL or both equal
              (pcr.model_norm IS NULL AND v_model_norm IS NULL)
              OR pcr.model_norm = v_model_norm
            )
        );
        
        -- Count if actually inserted
        IF FOUND THEN
          v_rules_count := v_rules_count + 1;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN v_rules_count;
END;
$$;

-- Grant execute permission (in case it was revoked)
GRANT EXECUTE ON FUNCTION public.bulk_set_compatibility_rules(UUID, UUID, JSONB) TO authenticated;

-- Update function comment
COMMENT ON FUNCTION public.bulk_set_compatibility_rules IS 
  'Atomically replaces all compatibility rules for an inventory item. '
  'Uses a single transaction to ensure delete and insert are atomic - if insert fails, '
  'delete is rolled back. Validates organization membership before processing. '
  'Uses NOT EXISTS for duplicate detection to work with partial unique indexes.';

COMMIT;
