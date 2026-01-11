-- Migration: Add Server-Side RPC Functions for Compatibility Rules
-- Description: Adds RPC functions for atomic bulk operations and server-side counting
-- Date: 2026-01-11
-- Review: Addresses GitHub PR #491 Copilot review feedback (8th round)
--   - countEquipmentMatchingRules: Server-side counting instead of O(n*m) client-side
--   - bulkSetCompatibilityRules: Atomic transaction for delete-insert pattern

BEGIN;

-- ============================================================================
-- PART 1: RPC Function for Atomic Bulk Set of Compatibility Rules
-- ============================================================================

-- This function wraps delete-then-insert in a single transaction for atomicity.
-- If insert fails after delete, the entire transaction rolls back automatically.
-- Addresses: inventoryCompatibilityRulesService.ts:326 review comment about transaction guarantees.

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
        
        -- Insert with ON CONFLICT DO NOTHING to handle duplicates silently
        INSERT INTO public.part_compatibility_rules (
          inventory_item_id,
          manufacturer,
          model,
          manufacturer_norm,
          model_norm
        ) VALUES (
          p_item_id,
          trim(v_manufacturer),
          CASE WHEN v_model IS NOT NULL AND trim(v_model) <> '' THEN trim(v_model) ELSE NULL END,
          v_manufacturer_norm,
          v_model_norm
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.bulk_set_compatibility_rules(UUID, UUID, JSONB) TO authenticated;

-- Add function comment
COMMENT ON FUNCTION public.bulk_set_compatibility_rules IS 
  'Atomically replaces all compatibility rules for an inventory item. '
  'Uses a single transaction to ensure delete and insert are atomic - if insert fails, '
  'delete is rolled back. Validates organization membership before processing.';


-- ============================================================================
-- PART 2: RPC Function for Server-Side Equipment Match Counting
-- ============================================================================

-- This function performs equipment matching server-side instead of O(n*m) client-side.
-- Reduces network payload from O(n) equipment rows to O(1) integer result.
-- Addresses: inventoryCompatibilityRulesService.ts:415 review comment about performance.

CREATE OR REPLACE FUNCTION public.count_equipment_matching_rules(
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
  -- Each rule has: manufacturer (required), model (optional, NULL = any model)
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
        -- Model: NULL means "any model", otherwise must match
        AND (
          r->>'model' IS NULL 
          OR trim(r->>'model') = ''
          OR lower(trim(e.model)) = lower(trim(r->>'model'))
        )
    );

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.count_equipment_matching_rules(UUID, JSONB) TO authenticated;

-- Add function comment
COMMENT ON FUNCTION public.count_equipment_matching_rules IS 
  'Counts equipment matching the given compatibility rules server-side. '
  'More efficient than client-side O(n*m) matching for large fleets. '
  'Rules format: [{manufacturer: string, model: string|null}, ...]. '
  'NULL or empty model means "any model from this manufacturer".';

COMMIT;
