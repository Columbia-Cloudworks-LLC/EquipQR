-- Migration: Fix Part Lookup RPC type references
-- Description: Fully qualify custom type references to work with empty search_path
-- Date: 2026-01-25
-- Issue: #522 - PostgREST error "type verification_status does not exist"
-- Root cause: search_path = '' means unqualified types can't be resolved

BEGIN;

-- ============================================================================
-- Fix get_alternates_for_part_number to qualify custom types with schema
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_alternates_for_part_number(
  p_organization_id UUID,
  p_part_number TEXT
)
RETURNS TABLE (
  -- Group info
  group_id UUID,
  group_name TEXT,
  group_status public.verification_status,  -- Fully qualified
  group_verified BOOLEAN,
  group_notes TEXT,
  
  -- Identifier info (for non-inventory alternates)
  identifier_id UUID,
  identifier_type public.part_identifier_type,  -- Fully qualified
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
  v_search_pattern TEXT;
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
  -- Create search pattern for ILIKE (prefix match)
  v_search_pattern := v_norm_value || '%';
  
  -- Return empty if no valid input
  IF v_norm_value IS NULL OR v_norm_value = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH matching_identifiers AS (
    -- Find all identifiers matching the search term (exact or prefix)
    SELECT pi.id AS matched_id
    FROM public.part_identifiers pi
    WHERE pi.organization_id = p_organization_id
      AND (pi.norm_value = v_norm_value OR pi.norm_value ILIKE v_search_pattern)
  ),
  matching_groups AS (
    -- Find all groups containing those identifiers
    SELECT DISTINCT pagm.group_id
    FROM public.part_alternate_group_members pagm
    INNER JOIN matching_identifiers mi ON pagm.part_identifier_id = mi.matched_id
    
    UNION
    
    -- Also match by inventory item SKU or external_id (for items in groups)
    SELECT DISTINCT pagm.group_id
    FROM public.part_alternate_group_members pagm
    INNER JOIN public.inventory_items ii ON pagm.inventory_item_id = ii.id
    WHERE ii.organization_id = p_organization_id
      AND (
        lower(trim(ii.sku)) = v_norm_value
        OR lower(trim(ii.sku)) ILIKE v_search_pattern
        OR lower(trim(ii.external_id)) = v_norm_value
        OR lower(trim(ii.external_id)) ILIKE v_search_pattern
      )
  ),
  -- Results from alternate groups
  group_results AS (
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
        (pi.norm_value IS NOT NULL AND (pi.norm_value = v_norm_value OR pi.norm_value ILIKE v_search_pattern))
        OR (ii.sku IS NOT NULL AND (lower(trim(ii.sku)) = v_norm_value OR lower(trim(ii.sku)) ILIKE v_search_pattern))
        OR (ii.external_id IS NOT NULL AND (lower(trim(ii.external_id)) = v_norm_value OR lower(trim(ii.external_id)) ILIKE v_search_pattern))
      ) AS is_matching_input
      
    FROM matching_groups mg
    INNER JOIN public.part_alternate_groups pag ON pag.id = mg.group_id
    INNER JOIN public.part_alternate_group_members pagm ON pagm.group_id = pag.id
    LEFT JOIN public.part_identifiers pi ON pi.id = pagm.part_identifier_id
    LEFT JOIN public.inventory_items ii ON ii.id = COALESCE(pagm.inventory_item_id, pi.inventory_item_id)
    WHERE pag.organization_id = p_organization_id
  ),
  -- Direct inventory matches (items NOT in any alternate group)
  direct_inventory_matches AS (
    SELECT
      ii.id AS group_id,  -- Use inventory item ID as stable identifier for direct matches
      'Direct Match (No Alternates Defined)'::TEXT AS group_name,
      'unverified'::public.verification_status AS group_status,  -- Fully qualified cast
      FALSE AS group_verified,
      NULL::TEXT AS group_notes,
      
      NULL::UUID AS identifier_id,
      NULL::public.part_identifier_type AS identifier_type,  -- Fully qualified cast
      NULL::TEXT AS identifier_value,
      NULL::TEXT AS identifier_manufacturer,
      
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
      
      TRUE AS is_primary,  -- Direct match is primary
      TRUE AS is_matching_input
      
    FROM public.inventory_items ii
    WHERE ii.organization_id = p_organization_id
      AND (
        lower(trim(ii.sku)) = v_norm_value
        OR lower(trim(ii.sku)) ILIKE v_search_pattern
        OR lower(trim(ii.external_id)) = v_norm_value
        OR lower(trim(ii.external_id)) ILIKE v_search_pattern
        OR lower(trim(ii.name)) ILIKE v_search_pattern
      )
      -- Exclude items that are already in alternate groups (to avoid duplicates)
      AND NOT EXISTS (
        SELECT 1 FROM public.part_alternate_group_members pagm
        WHERE pagm.inventory_item_id = ii.id
      )
      -- Also exclude items linked via part_identifiers in groups
      AND NOT EXISTS (
        SELECT 1 FROM public.part_identifiers pi
        INNER JOIN public.part_alternate_group_members pagm ON pagm.part_identifier_id = pi.id
        WHERE pi.inventory_item_id = ii.id
      )
  ),
  -- Combine results: group alternates first, then direct matches
  combined_results AS (
    SELECT * FROM group_results
    UNION ALL
    SELECT * FROM direct_inventory_matches
  )
  SELECT * FROM combined_results cr
  ORDER BY
    (cr.group_id IS NULL) ASC,  -- Group alternates first, then direct matches
    cr.group_name NULLS LAST,
    cr.is_primary DESC,
    cr.is_in_stock DESC,  -- In-stock first
    cr.default_unit_cost ASC NULLS LAST,
    cr.inventory_name NULLS LAST;
END;
$$;

-- Update function comment
COMMENT ON FUNCTION public.get_alternates_for_part_number IS 
  'Looks up alternate/interchangeable parts by part number. '
  'Searches part_identifiers and inventory_items (by SKU/external_id/name), '
  'then returns all members of matching alternate groups with stock info. '
  'Also returns direct inventory matches for items not in any alternate group. '
  'Supports prefix matching for partial searches. '
  'Results are sorted: in-stock first, then by cost.';

COMMIT;
