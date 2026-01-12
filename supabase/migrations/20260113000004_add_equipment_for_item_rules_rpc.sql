-- Migration: Add RPC to get equipment matching an inventory item's compatibility rules
-- Description: Creates the inverse of get_compatible_parts_for_equipment - gets equipment 
--              that matches the compatibility rules defined for an inventory item
-- Date: 2026-01-13
-- Purpose: Complete the circle - allow viewing matching equipment from inventory item detail

BEGIN;

-- ============================================================================
-- get_equipment_for_inventory_item_rules
-- Returns equipment that matches the compatibility rules of a specific inventory item
-- Modeled after get_compatible_parts_for_equipment (the inverse operation)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_equipment_for_inventory_item_rules(
  p_organization_id UUID,
  p_item_id UUID
)
RETURNS TABLE (
  equipment_id UUID,
  name TEXT,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  status TEXT,
  location TEXT,
  matched_rule_id UUID,
  matched_rule_manufacturer TEXT,
  matched_rule_model TEXT,
  matched_rule_match_type model_match_type,
  matched_rule_status verification_status
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  -- Start from equipment (like the working function does)
  -- and find rules that match
  SELECT DISTINCT ON (e.id)
    e.id AS equipment_id,
    e.name::TEXT,
    e.manufacturer::TEXT,
    e.model::TEXT,
    e.serial_number::TEXT,
    e.status::TEXT,
    e.location::TEXT,
    pcr.id AS matched_rule_id,
    pcr.manufacturer::TEXT AS matched_rule_manufacturer,
    pcr.model::TEXT AS matched_rule_model,
    pcr.match_type AS matched_rule_match_type,
    pcr.status AS matched_rule_status
  FROM public.equipment e
  JOIN public.part_compatibility_rules pcr
    ON pcr.manufacturer_norm = lower(trim(e.manufacturer))
    AND (
      -- ANY: match any model from this manufacturer
      pcr.match_type = 'any'
      
      -- EXACT: model must match exactly
      OR (pcr.match_type = 'exact' AND pcr.model_norm = lower(trim(e.model)))
      
      -- PREFIX: model starts with pattern
      OR (pcr.match_type = 'prefix' AND lower(trim(e.model)) LIKE (pcr.model_pattern_norm || '%'))
      
      -- WILDCARD: model matches pattern
      OR (pcr.match_type = 'wildcard' AND lower(trim(e.model)) LIKE pcr.model_pattern_norm)
      
      -- Legacy: NULL model_norm with exact type means any model
      OR (pcr.model_norm IS NULL AND pcr.match_type = 'exact')
    )
  JOIN public.inventory_items ii 
    ON ii.id = pcr.inventory_item_id
    AND ii.organization_id = p_organization_id
  WHERE e.organization_id = p_organization_id
    AND pcr.inventory_item_id = p_item_id
  ORDER BY e.id, pcr.status DESC, e.name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_equipment_for_inventory_item_rules(UUID, UUID) TO authenticated;

-- Add function comment
COMMENT ON FUNCTION public.get_equipment_for_inventory_item_rules IS 
  'Returns equipment that matches the compatibility rules of a specific inventory item. '
  'This is the inverse of get_compatible_parts_for_equipment - used to show which equipment '
  'an inventory item is compatible with based on its manufacturer/model rules.';

COMMIT;
