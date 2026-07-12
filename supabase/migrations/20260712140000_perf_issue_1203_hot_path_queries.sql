-- Issue #1203: Supabase hot-path performance — inventory metadata RPC,
-- equipment_notes org scoping for realtime filters.

-- ============================================================================
-- PART 1: Inventory list metadata aggregation (bounded single query)
-- ============================================================================

-- rpc-authenticated-grant-allowed: get_inventory_list_metadata
CREATE OR REPLACE FUNCTION public.get_inventory_list_metadata(p_organization_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_result JSON;
BEGIN
  PERFORM public.assert_inventory_read_access(p_organization_id);

  SELECT json_build_object(
    'uniqueLocations', COALESCE((
      SELECT json_agg(location ORDER BY location)
      FROM (
        SELECT DISTINCT trim(location) AS location
        FROM public.inventory_items
        WHERE organization_id = p_organization_id
          AND location IS NOT NULL
          AND trim(location) <> ''
      ) locations
    ), '[]'::json),
    'totalCount', COALESCE(COUNT(*)::int, 0),
    'negativeStockCount', COALESCE(COUNT(*) FILTER (WHERE quantity_on_hand < 0)::int, 0),
    'outOfStockCount', COALESCE(COUNT(*) FILTER (WHERE quantity_on_hand = 0)::int, 0),
    'lowStockCount', COALESCE(
      COUNT(*) FILTER (
        WHERE quantity_on_hand > 0
          AND quantity_on_hand <= low_stock_threshold
      )::int,
      0
    ),
    'healthyCount', COALESCE(COUNT(*) FILTER (WHERE quantity_on_hand > low_stock_threshold)::int, 0),
    'missingLocationCount', COALESCE(
      COUNT(*) FILTER (WHERE location IS NULL OR trim(location) = '')::int,
      0
    ),
    'missingUnitCostCount', COALESCE(COUNT(*) FILTER (WHERE default_unit_cost IS NULL)::int, 0),
    'missingSkuCount', COALESCE(COUNT(*) FILTER (WHERE sku IS NULL OR trim(sku) = '')::int, 0),
    'estimatedInventoryValue', COALESCE(SUM(
      CASE
        WHEN default_unit_cost IS NOT NULL AND quantity_on_hand IS NOT NULL
          THEN default_unit_cost * quantity_on_hand
        ELSE 0
      END
    ), 0)
  )
  INTO v_result
  FROM public.inventory_items
  WHERE organization_id = p_organization_id;

  RETURN COALESCE(
    v_result,
    json_build_object(
      'uniqueLocations', '[]'::json,
      'totalCount', 0,
      'negativeStockCount', 0,
      'outOfStockCount', 0,
      'lowStockCount', 0,
      'healthyCount', 0,
      'missingLocationCount', 0,
      'missingUnitCostCount', 0,
      'missingSkuCount', 0,
      'estimatedInventoryValue', 0
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_inventory_list_metadata(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_inventory_list_metadata(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_inventory_list_metadata(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_inventory_list_metadata IS
  'Returns inventory list health/metadata aggregates for an organization in a single bounded query.';

-- ============================================================================
-- PART 2: Denormalize organization_id on equipment_notes for realtime filters
-- ============================================================================

ALTER TABLE public.equipment_notes
  ADD COLUMN IF NOT EXISTS organization_id UUID;

UPDATE public.equipment_notes en
SET organization_id = e.organization_id
FROM public.equipment e
WHERE en.equipment_id = e.id
  AND en.organization_id IS NULL;

ALTER TABLE public.equipment_notes
  ALTER COLUMN organization_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'equipment_notes_organization_id_fkey'
  ) THEN
    ALTER TABLE public.equipment_notes
      ADD CONSTRAINT equipment_notes_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_equipment_notes_organization_id
  ON public.equipment_notes USING btree (organization_id);

CREATE OR REPLACE FUNCTION public.set_equipment_note_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  SELECT e.organization_id
  INTO NEW.organization_id
  FROM public.equipment e
  WHERE e.id = NEW.equipment_id;

  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'equipment_notes requires equipment with organization_id'
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_equipment_notes_set_organization_id ON public.equipment_notes;

CREATE TRIGGER trg_equipment_notes_set_organization_id
  BEFORE INSERT OR UPDATE OF equipment_id ON public.equipment_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_equipment_note_organization_id();
