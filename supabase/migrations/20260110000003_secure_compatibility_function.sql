-- Migration: Add Organization Membership Validation to Compatibility RPC
-- Description: Security enhancement to verify caller is member of the organization
-- Date: 2026-01-10
-- Review: Addresses PR #491 feedback - prevents unauthorized organization_id access

BEGIN;

-- Replace the function with added security check at the start
-- Verifies the calling user is an active member of the specified organization
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
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Security check: Verify the calling user is an active member of the organization
  -- This is defense-in-depth on top of RLS policies
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    -- Return empty result set for unauthorized access (fail securely without leaking info)
    RETURN;
  END IF;

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

  -- Rule-based matches (case-insensitive + trimmed exact match)
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
    AND (pcr.model_norm IS NULL OR pcr.model_norm = lower(trim(e.model)))
  JOIN public.inventory_items ii ON ii.id = pcr.inventory_item_id
    AND ii.organization_id = p_organization_id
  WHERE e.id = ANY(p_equipment_ids)
    AND e.organization_id = p_organization_id;
END;
$$;

-- Update function comment
COMMENT ON FUNCTION public.get_compatible_parts_for_equipment IS 'Returns compatible inventory items for given equipment IDs. Validates caller is an active member of the organization before processing. Combines direct links (equipment_part_compatibility) with rule-based matches (part_compatibility_rules by manufacturer/model).';

COMMIT;
