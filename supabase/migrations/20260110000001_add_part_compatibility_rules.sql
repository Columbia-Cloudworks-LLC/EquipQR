-- Migration: Add Part Compatibility Rules
-- Description: Creates rule-based part-to-equipment matching by manufacturer/model
-- Date: 2026-01-10

BEGIN;

-- ============================================================================
-- PART 1: Create part_compatibility_rules table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.part_compatibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  
  -- Raw values (for display in UI)
  manufacturer TEXT NOT NULL,
  model TEXT,  -- NULL means "any model from this manufacturer"
  
  -- Normalized values for case-insensitive + trimmed exact matching
  manufacturer_norm TEXT NOT NULL,
  model_norm TEXT,  -- NULL means "any model"
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate rules (same manufacturer/model after normalization)
  CONSTRAINT part_compatibility_rules_unique UNIQUE (inventory_item_id, manufacturer_norm, model_norm)
);

-- Add comment for documentation
COMMENT ON TABLE public.part_compatibility_rules IS 'Defines rule-based compatibility between inventory parts and equipment by manufacturer/model patterns. NULL model means "any model from this manufacturer".';

-- ============================================================================
-- PART 2: Create indexes for performance
-- ============================================================================

-- Index for looking up rules by inventory item (form editing)
CREATE INDEX IF NOT EXISTS idx_part_compat_rules_item 
  ON public.part_compatibility_rules(inventory_item_id);

-- Index for matching equipment to rules (work order part picker)
CREATE INDEX IF NOT EXISTS idx_part_compat_rules_mfr_model_norm 
  ON public.part_compatibility_rules(manufacturer_norm, model_norm);

-- Partial index for "any model" rules (WHERE model_norm IS NULL)
CREATE INDEX IF NOT EXISTS idx_part_compat_rules_mfr_any_model 
  ON public.part_compatibility_rules(manufacturer_norm) 
  WHERE model_norm IS NULL;

-- ============================================================================
-- PART 3: Enable RLS and create policies
-- ============================================================================

ALTER TABLE public.part_compatibility_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access rules for inventory items in their active organizations
CREATE POLICY "part_compatibility_rules_org_isolation" ON public.part_compatibility_rules
FOR ALL USING (
  inventory_item_id IN (
    SELECT id FROM public.inventory_items 
    WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  )
);

-- ============================================================================
-- PART 4: Create RPC function for combined compatibility matching
-- ============================================================================

-- Function returns compatible inventory items for given equipment IDs
-- Uses UNION of direct links (equipment_part_compatibility) and rule-based matches
-- Security: Explicitly sets SECURITY INVOKER (which is the PostgreSQL default) for documentation clarity.
--           This ensures RLS policies apply when the function queries tables, and org isolation is
--           enforced in both the direct-link and rule-based matching branches.

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
SET search_path = public
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_compatible_parts_for_equipment(UUID, UUID[]) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_compatible_parts_for_equipment IS 'Returns compatible inventory items for given equipment IDs. Combines direct links (equipment_part_compatibility) with rule-based matches (part_compatibility_rules by manufacturer/model). Uses SECURITY INVOKER for RLS enforcement.';

COMMIT;
