-- Migration: Add Alternate Parts Lookup RPC
-- Description: Creates RPC function for looking up alternate/interchangeable parts by part number
-- Date: 2026-01-12
-- Purpose: Enable technicians to find compatible parts without requiring equipment records

BEGIN;

-- ============================================================================
-- PART 1: RPC Function to lookup alternates by part number
-- ============================================================================

-- This function finds all alternate parts for a given part number:
-- 1. Looks up the part number in part_identifiers (normalized)
-- 2. Finds all alternate groups containing that identifier
-- 3. Returns all other members of those groups with inventory/stock info

CREATE OR REPLACE FUNCTION public.get_alternates_for_part_number(
  p_organization_id UUID,
  p_part_number TEXT
)
RETURNS TABLE (
  -- Group info
  group_id UUID,
  group_name TEXT,
  group_status verification_status,
  group_verified BOOLEAN,
  group_notes TEXT,
  
  -- Identifier info (for non-inventory alternates)
  identifier_id UUID,
  identifier_type part_identifier_type,
  identifier_value TEXT,
  identifier_manufacturer TEXT,
  
  -- Inventory item info (if stocked)
  inventory_item_id UUID,
  inventory_name TEXT,
  inventory_sku TEXT,
  quantity_on_hand INTEGER,
  low_stock_threshold INTEGER,
  default_unit_cost NUMERIC,
  location TEXT,
  image_url TEXT,
  is_in_stock BOOLEAN,
  is_low_stock BOOLEAN,
  
  -- Member metadata
  is_primary BOOLEAN,
  is_matching_input BOOLEAN  -- TRUE for the part number that was searched
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_norm_value TEXT;
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

  -- Normalize the input part number
  v_norm_value := lower(trim(p_part_number));
  
  -- Return empty if no valid input
  IF v_norm_value IS NULL OR v_norm_value = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH matching_identifiers AS (
    -- Find all identifiers matching the search term
    SELECT pi.id AS matched_id
    FROM public.part_identifiers pi
    WHERE pi.organization_id = p_organization_id
      AND pi.norm_value = v_norm_value
  ),
  matching_groups AS (
    -- Find all groups containing those identifiers
    SELECT DISTINCT pagm.group_id
    FROM public.part_alternate_group_members pagm
    INNER JOIN matching_identifiers mi ON pagm.part_identifier_id = mi.matched_id
    
    UNION
    
    -- Also match by inventory item SKU or external_id
    SELECT DISTINCT pagm.group_id
    FROM public.part_alternate_group_members pagm
    INNER JOIN public.inventory_items ii ON pagm.inventory_item_id = ii.id
    WHERE ii.organization_id = p_organization_id
      AND (
        lower(trim(ii.sku)) = v_norm_value
        OR lower(trim(ii.external_id)) = v_norm_value
      )
  )
  SELECT
    pag.id AS group_id,
    pag.name AS group_name,
    pag.status AS group_status,
    (pag.status = 'verified') AS group_verified,
    pag.notes AS group_notes,
    
    pi.id AS identifier_id,
    pi.identifier_type,
    pi.raw_value AS identifier_value,
    pi.manufacturer AS identifier_manufacturer,
    
    ii.id AS inventory_item_id,
    ii.name AS inventory_name,
    ii.sku AS inventory_sku,
    COALESCE(ii.quantity_on_hand, 0) AS quantity_on_hand,
    COALESCE(ii.low_stock_threshold, 5) AS low_stock_threshold,
    ii.default_unit_cost,
    ii.location,
    ii.image_url,
    (COALESCE(ii.quantity_on_hand, 0) > 0) AS is_in_stock,
    (COALESCE(ii.quantity_on_hand, 0) <= COALESCE(ii.low_stock_threshold, 5)) AS is_low_stock,
    
    pagm.is_primary,
    -- Mark if this row matches the input search term
    (
      (pi.norm_value IS NOT NULL AND pi.norm_value = v_norm_value)
      OR (ii.sku IS NOT NULL AND lower(trim(ii.sku)) = v_norm_value)
      OR (ii.external_id IS NOT NULL AND lower(trim(ii.external_id)) = v_norm_value)
    ) AS is_matching_input
    
  FROM matching_groups mg
  INNER JOIN public.part_alternate_groups pag ON pag.id = mg.group_id
  INNER JOIN public.part_alternate_group_members pagm ON pagm.group_id = pag.id
  LEFT JOIN public.part_identifiers pi ON pi.id = pagm.part_identifier_id
  LEFT JOIN public.inventory_items ii ON ii.id = COALESCE(pagm.inventory_item_id, pi.inventory_item_id)
  
  WHERE pag.organization_id = p_organization_id
  
  ORDER BY
    pag.name,
    pagm.is_primary DESC,
    (ii.quantity_on_hand > 0) DESC,  -- In-stock first
    ii.default_unit_cost ASC NULLS LAST,  -- Cheapest first
    ii.name NULLS LAST;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_alternates_for_part_number(UUID, TEXT) TO authenticated;

-- Add function comment
COMMENT ON FUNCTION public.get_alternates_for_part_number IS 
  'Looks up alternate/interchangeable parts by part number. '
  'Searches part_identifiers and inventory_items (by SKU/external_id), '
  'then returns all members of matching alternate groups with stock info. '
  'Results are sorted: in-stock first, then by cost.';


-- ============================================================================
-- PART 2: RPC Function to get all alternates for an inventory item
-- ============================================================================

-- Convenience function to look up alternates for a specific inventory item

CREATE OR REPLACE FUNCTION public.get_alternates_for_inventory_item(
  p_organization_id UUID,
  p_inventory_item_id UUID
)
RETURNS TABLE (
  -- Group info
  group_id UUID,
  group_name TEXT,
  group_status verification_status,
  group_verified BOOLEAN,
  group_notes TEXT,
  
  -- Identifier info (for non-inventory alternates)
  identifier_id UUID,
  identifier_type part_identifier_type,
  identifier_value TEXT,
  identifier_manufacturer TEXT,
  
  -- Inventory item info (if stocked)
  inventory_item_id UUID,
  inventory_name TEXT,
  inventory_sku TEXT,
  quantity_on_hand INTEGER,
  low_stock_threshold INTEGER,
  default_unit_cost NUMERIC,
  location TEXT,
  image_url TEXT,
  is_in_stock BOOLEAN,
  is_low_stock BOOLEAN,
  
  -- Member metadata
  is_primary BOOLEAN,
  is_source_item BOOLEAN  -- TRUE for the item that was searched
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
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

  RETURN QUERY
  WITH item_groups AS (
    -- Find all groups containing this inventory item
    SELECT DISTINCT pagm.group_id
    FROM public.part_alternate_group_members pagm
    WHERE pagm.inventory_item_id = p_inventory_item_id
    
    UNION
    
    -- Also find groups via identifiers linked to this item
    SELECT DISTINCT pagm.group_id
    FROM public.part_alternate_group_members pagm
    INNER JOIN public.part_identifiers pi ON pagm.part_identifier_id = pi.id
    WHERE pi.inventory_item_id = p_inventory_item_id
  )
  SELECT
    pag.id AS group_id,
    pag.name AS group_name,
    pag.status AS group_status,
    (pag.status = 'verified') AS group_verified,
    pag.notes AS group_notes,
    
    pi.id AS identifier_id,
    pi.identifier_type,
    pi.raw_value AS identifier_value,
    pi.manufacturer AS identifier_manufacturer,
    
    ii.id AS inventory_item_id,
    ii.name AS inventory_name,
    ii.sku AS inventory_sku,
    COALESCE(ii.quantity_on_hand, 0) AS quantity_on_hand,
    COALESCE(ii.low_stock_threshold, 5) AS low_stock_threshold,
    ii.default_unit_cost,
    ii.location,
    ii.image_url,
    (COALESCE(ii.quantity_on_hand, 0) > 0) AS is_in_stock,
    (COALESCE(ii.quantity_on_hand, 0) <= COALESCE(ii.low_stock_threshold, 5)) AS is_low_stock,
    
    pagm.is_primary,
    (ii.id = p_inventory_item_id) AS is_source_item
    
  FROM item_groups ig
  INNER JOIN public.part_alternate_groups pag ON pag.id = ig.group_id
  INNER JOIN public.part_alternate_group_members pagm ON pagm.group_id = pag.id
  LEFT JOIN public.part_identifiers pi ON pi.id = pagm.part_identifier_id
  LEFT JOIN public.inventory_items ii ON ii.id = COALESCE(pagm.inventory_item_id, pi.inventory_item_id)
  
  WHERE pag.organization_id = p_organization_id
  
  ORDER BY
    pag.name,
    pagm.is_primary DESC,
    (ii.id = p_inventory_item_id) DESC,  -- Source item first
    (ii.quantity_on_hand > 0) DESC,  -- In-stock first
    ii.default_unit_cost ASC NULLS LAST,
    ii.name NULLS LAST;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_alternates_for_inventory_item(UUID, UUID) TO authenticated;

-- Add function comment
COMMENT ON FUNCTION public.get_alternates_for_inventory_item IS 
  'Finds all alternate parts for a given inventory item. '
  'Returns all members of alternate groups containing this item.';

COMMIT;
