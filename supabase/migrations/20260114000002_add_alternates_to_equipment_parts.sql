-- Migration: Add has_alternates to get_compatible_parts_for_equipment RPC
-- Description: Modifies the RPC to indicate which parts have alternate options
--              and sorts parts with alternates first for better visibility
-- Date: 2026-01-14
-- Purpose: Help users find parts with alternates when viewing equipment parts tab

BEGIN;

-- ============================================================================
-- Drop existing function first (required when changing return type)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_compatible_parts_for_equipment(UUID, UUID[]);

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
  match_type TEXT,
  has_alternates BOOLEAN
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
  WITH compatible_parts AS (
    -- Direct links (org-safe by joining inventory_items and filtering organization_id)
    SELECT
      ii.id AS inv_item_id,
      ii.name AS item_name,
      ii.sku AS item_sku,
      ii.external_id AS item_external_id,
      ii.quantity_on_hand AS item_qty,
      ii.low_stock_threshold AS item_threshold,
      ii.default_unit_cost AS item_cost,
      ii.location AS item_location,
      ii.image_url AS item_image,
      'direct'::TEXT AS item_match_type
    FROM public.equipment_part_compatibility epc
    JOIN public.inventory_items ii ON ii.id = epc.inventory_item_id
    WHERE epc.equipment_id = ANY(p_equipment_ids)
      AND ii.organization_id = p_organization_id

    UNION

    -- Rule-based matches (with pattern support)
    SELECT
      ii.id AS inv_item_id,
      ii.name AS item_name,
      ii.sku AS item_sku,
      ii.external_id AS item_external_id,
      ii.quantity_on_hand AS item_qty,
      ii.low_stock_threshold AS item_threshold,
      ii.default_unit_cost AS item_cost,
      ii.location AS item_location,
      ii.image_url AS item_image,
      'rule'::TEXT AS item_match_type
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
      AND e.organization_id = p_organization_id
  ),
  -- Deduplicate and add has_alternates flag
  parts_with_alternates AS (
    SELECT DISTINCT
      cp.inv_item_id,
      cp.item_name,
      cp.item_sku,
      cp.item_external_id,
      cp.item_qty,
      cp.item_threshold,
      cp.item_cost,
      cp.item_location,
      cp.item_image,
      cp.item_match_type,
      EXISTS (
        SELECT 1 FROM public.part_alternate_group_members pagm 
        WHERE pagm.inventory_item_id = cp.inv_item_id
      ) AS item_has_alternates
    FROM compatible_parts cp
  )
  -- Return with final sort: alternates first, then cheapest price, then by name
  -- NULLS LAST ensures items with prices appear before items without prices
  SELECT
    pwa.inv_item_id AS inventory_item_id,
    pwa.item_name AS name,
    pwa.item_sku AS sku,
    pwa.item_external_id AS external_id,
    pwa.item_qty AS quantity_on_hand,
    pwa.item_threshold AS low_stock_threshold,
    pwa.item_cost AS default_unit_cost,
    pwa.item_location AS location,
    pwa.item_image AS image_url,
    pwa.item_match_type AS match_type,
    pwa.item_has_alternates AS has_alternates
  FROM parts_with_alternates pwa
  ORDER BY pwa.item_has_alternates DESC, pwa.item_cost ASC NULLS LAST, pwa.item_name ASC;
END;
$$;

-- Update function comment
COMMENT ON FUNCTION public.get_compatible_parts_for_equipment IS 
  'Returns compatible inventory items for given equipment IDs. '
  'Combines direct links with rule-based matches including pattern matching. '
  'Includes has_alternates flag and sorts: alternates first, then cheapest price, then by name.';

-- Maintain execute permissions
GRANT EXECUTE ON FUNCTION public.get_compatible_parts_for_equipment TO authenticated;

COMMIT;
