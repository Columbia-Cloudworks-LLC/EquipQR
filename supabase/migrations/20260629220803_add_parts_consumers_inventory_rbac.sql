-- ============================================================================
-- Migration: Inventory RBAC — Parts Consumers (issue #1095)
--
-- Adds organization-level parts_consumers grant (read-only inventory access)
-- and restricts inventory/alternate/lookup surfaces to owners, admins,
-- parts managers, and explicit parts consumers. No backfill of existing members.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: parts_consumers table (mirrors parts_managers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.parts_consumers (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id)
);

COMMENT ON TABLE public.parts_consumers IS
  'Organization-level parts consumers who can view inventory, alternate groups, and use part lookup without edit rights.';

CREATE INDEX IF NOT EXISTS idx_parts_consumers_org_id
  ON public.parts_consumers(organization_id);

CREATE INDEX IF NOT EXISTS idx_parts_consumers_user_id
  ON public.parts_consumers(user_id);

ALTER TABLE public.parts_consumers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parts_consumers_select_policy ON public.parts_consumers;
CREATE POLICY parts_consumers_select_policy ON public.parts_consumers
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = (SELECT auth.uid())
        AND status = 'active'
    )
  );

DROP POLICY IF EXISTS parts_consumers_insert_policy ON public.parts_consumers;
CREATE POLICY parts_consumers_insert_policy ON public.parts_consumers
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = (SELECT auth.uid())
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS parts_consumers_delete_policy ON public.parts_consumers;
CREATE POLICY parts_consumers_delete_policy ON public.parts_consumers
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = (SELECT auth.uid())
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- PART 2: Helper functions
-- rpc-authenticated-grant-allowed: is_parts_consumer
-- rpc-authenticated-grant-allowed: can_access_inventory
-- rpc-authenticated-grant-allowed: assert_inventory_read_access
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_parts_consumer(
  p_organization_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.parts_consumers
    WHERE organization_id = p_organization_id
      AND user_id = p_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_parts_consumer(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.is_parts_consumer IS
  'Checks if a user is a parts consumer for the given organization.';

CREATE OR REPLACE FUNCTION public.can_access_inventory(
  p_organization_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.organization_members
  WHERE organization_id = p_organization_id
    AND user_id = p_user_id
    AND status = 'active';

  IF v_role IN ('owner', 'admin') THEN
    RETURN TRUE;
  END IF;

  IF public.is_parts_manager(p_organization_id, p_user_id) THEN
    RETURN TRUE;
  END IF;

  RETURN public.is_parts_consumer(p_organization_id, p_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_inventory(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.can_access_inventory IS
  'Returns TRUE when the user may view inventory, alternate groups, and part lookup for the organization.';

-- ============================================================================
-- PART 3: RLS — inventory_items
-- ============================================================================

DROP POLICY IF EXISTS inventory_items_organization_isolation ON public.inventory_items;
DROP POLICY IF EXISTS inventory_items_select ON public.inventory_items;
DROP POLICY IF EXISTS inventory_items_insert ON public.inventory_items;
DROP POLICY IF EXISTS inventory_items_update ON public.inventory_items;
DROP POLICY IF EXISTS inventory_items_delete ON public.inventory_items;

CREATE POLICY inventory_items_select ON public.inventory_items
  FOR SELECT TO public
  USING (public.can_access_inventory(organization_id));

CREATE POLICY inventory_items_insert ON public.inventory_items
  FOR INSERT TO public
  WITH CHECK (public.can_manage_inventory(organization_id));

CREATE POLICY inventory_items_update ON public.inventory_items
  FOR UPDATE TO public
  USING (public.can_manage_inventory(organization_id))
  WITH CHECK (public.can_manage_inventory(organization_id));

CREATE POLICY inventory_items_delete ON public.inventory_items
  FOR DELETE TO public
  USING (public.is_org_admin((SELECT auth.uid()), organization_id));

-- ============================================================================
-- PART 4: RLS — inventory_transactions
-- ============================================================================

DROP POLICY IF EXISTS inventory_transactions_organization_isolation ON public.inventory_transactions;
DROP POLICY IF EXISTS inventory_transactions_select ON public.inventory_transactions;

CREATE POLICY inventory_transactions_select ON public.inventory_transactions
  FOR SELECT TO public
  USING (public.can_access_inventory(organization_id));

-- ============================================================================
-- PART 5: RLS — inventory_item_images
-- ============================================================================

DROP POLICY IF EXISTS inventory_item_images_select ON public.inventory_item_images;
DROP POLICY IF EXISTS inventory_item_images_insert ON public.inventory_item_images;
DROP POLICY IF EXISTS inventory_item_images_delete ON public.inventory_item_images;

CREATE POLICY inventory_item_images_select ON public.inventory_item_images
  FOR SELECT
  USING (public.can_access_inventory(organization_id));

CREATE POLICY inventory_item_images_insert ON public.inventory_item_images
  FOR INSERT
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND public.can_manage_inventory(organization_id)
    AND EXISTS (
      SELECT 1 FROM public.inventory_items
      WHERE id = inventory_item_id
        AND organization_id = inventory_item_images.organization_id
    )
  );

CREATE POLICY inventory_item_images_delete ON public.inventory_item_images
  FOR DELETE
  USING (
    (
      uploaded_by = (SELECT auth.uid())
      AND public.can_access_inventory(organization_id)
    )
    OR public.is_org_admin((SELECT auth.uid()), organization_id)
  );

-- ============================================================================
-- PART 6: RLS — equipment_part_compatibility
-- ============================================================================

DROP POLICY IF EXISTS equipment_part_compatibility_organization_isolation ON public.equipment_part_compatibility;
DROP POLICY IF EXISTS equipment_part_compatibility_select ON public.equipment_part_compatibility;
DROP POLICY IF EXISTS equipment_part_compatibility_insert ON public.equipment_part_compatibility;
DROP POLICY IF EXISTS equipment_part_compatibility_update ON public.equipment_part_compatibility;
DROP POLICY IF EXISTS equipment_part_compatibility_delete ON public.equipment_part_compatibility;

CREATE POLICY equipment_part_compatibility_select ON public.equipment_part_compatibility
  FOR SELECT TO public
  USING (
    equipment_id IN (
      SELECT e.id FROM public.equipment e
      WHERE public.can_access_inventory(e.organization_id)
    )
  );

CREATE POLICY equipment_part_compatibility_insert ON public.equipment_part_compatibility
  FOR INSERT TO public
  WITH CHECK (
    equipment_id IN (
      SELECT e.id FROM public.equipment e
      WHERE public.can_manage_inventory(e.organization_id)
    )
  );

CREATE POLICY equipment_part_compatibility_update ON public.equipment_part_compatibility
  FOR UPDATE TO public
  USING (
    equipment_id IN (
      SELECT e.id FROM public.equipment e
      WHERE public.can_manage_inventory(e.organization_id)
    )
  );

CREATE POLICY equipment_part_compatibility_delete ON public.equipment_part_compatibility
  FOR DELETE TO public
  USING (
    equipment_id IN (
      SELECT e.id FROM public.equipment e
      WHERE public.can_manage_inventory(e.organization_id)
    )
  );

-- ============================================================================
-- PART 7: RLS — part_compatibility_rules
-- ============================================================================

DROP POLICY IF EXISTS part_compatibility_rules_org_isolation ON public.part_compatibility_rules;
DROP POLICY IF EXISTS part_compatibility_rules_select ON public.part_compatibility_rules;
DROP POLICY IF EXISTS part_compatibility_rules_insert ON public.part_compatibility_rules;
DROP POLICY IF EXISTS part_compatibility_rules_update ON public.part_compatibility_rules;
DROP POLICY IF EXISTS part_compatibility_rules_delete ON public.part_compatibility_rules;

CREATE POLICY part_compatibility_rules_select ON public.part_compatibility_rules
  FOR SELECT TO public
  USING (
    inventory_item_id IN (
      SELECT ii.id FROM public.inventory_items ii
      WHERE public.can_access_inventory(ii.organization_id)
    )
  );

CREATE POLICY part_compatibility_rules_insert ON public.part_compatibility_rules
  FOR INSERT TO public
  WITH CHECK (
    inventory_item_id IN (
      SELECT ii.id FROM public.inventory_items ii
      WHERE public.can_manage_inventory(ii.organization_id)
    )
  );

CREATE POLICY part_compatibility_rules_update ON public.part_compatibility_rules
  FOR UPDATE TO public
  USING (
    inventory_item_id IN (
      SELECT ii.id FROM public.inventory_items ii
      WHERE public.can_manage_inventory(ii.organization_id)
    )
  );

CREATE POLICY part_compatibility_rules_delete ON public.part_compatibility_rules
  FOR DELETE TO public
  USING (
    inventory_item_id IN (
      SELECT ii.id FROM public.inventory_items ii
      WHERE public.can_manage_inventory(ii.organization_id)
    )
  );

-- ============================================================================
-- PART 8: RLS — part_alternate_groups
-- ============================================================================

DROP POLICY IF EXISTS part_alternate_groups_org_isolation ON public.part_alternate_groups;
DROP POLICY IF EXISTS part_alternate_groups_select ON public.part_alternate_groups;
DROP POLICY IF EXISTS part_alternate_groups_insert ON public.part_alternate_groups;
DROP POLICY IF EXISTS part_alternate_groups_update ON public.part_alternate_groups;
DROP POLICY IF EXISTS part_alternate_groups_delete ON public.part_alternate_groups;

CREATE POLICY part_alternate_groups_select ON public.part_alternate_groups
  FOR SELECT TO public
  USING (public.can_access_inventory(organization_id));

CREATE POLICY part_alternate_groups_insert ON public.part_alternate_groups
  FOR INSERT TO public
  WITH CHECK (public.can_manage_inventory(organization_id));

CREATE POLICY part_alternate_groups_update ON public.part_alternate_groups
  FOR UPDATE TO public
  USING (public.can_manage_inventory(organization_id))
  WITH CHECK (public.can_manage_inventory(organization_id));

CREATE POLICY part_alternate_groups_delete ON public.part_alternate_groups
  FOR DELETE TO public
  USING (public.can_manage_inventory(organization_id));

-- ============================================================================
-- PART 9: RLS — part_identifiers
-- ============================================================================

DROP POLICY IF EXISTS part_identifiers_org_isolation ON public.part_identifiers;
DROP POLICY IF EXISTS part_identifiers_select ON public.part_identifiers;
DROP POLICY IF EXISTS part_identifiers_insert ON public.part_identifiers;
DROP POLICY IF EXISTS part_identifiers_update ON public.part_identifiers;
DROP POLICY IF EXISTS part_identifiers_delete ON public.part_identifiers;

CREATE POLICY part_identifiers_select ON public.part_identifiers
  FOR SELECT TO public
  USING (public.can_access_inventory(organization_id));

CREATE POLICY part_identifiers_insert ON public.part_identifiers
  FOR INSERT TO public
  WITH CHECK (public.can_manage_inventory(organization_id));

CREATE POLICY part_identifiers_update ON public.part_identifiers
  FOR UPDATE TO public
  USING (public.can_manage_inventory(organization_id))
  WITH CHECK (public.can_manage_inventory(organization_id));

CREATE POLICY part_identifiers_delete ON public.part_identifiers
  FOR DELETE TO public
  USING (public.can_manage_inventory(organization_id));

-- ============================================================================
-- PART 10: RLS — part_alternate_group_members
-- ============================================================================

DROP POLICY IF EXISTS part_alternate_group_members_org_isolation ON public.part_alternate_group_members;
DROP POLICY IF EXISTS part_alternate_group_members_select ON public.part_alternate_group_members;
DROP POLICY IF EXISTS part_alternate_group_members_insert ON public.part_alternate_group_members;
DROP POLICY IF EXISTS part_alternate_group_members_update ON public.part_alternate_group_members;
DROP POLICY IF EXISTS part_alternate_group_members_delete ON public.part_alternate_group_members;

CREATE POLICY part_alternate_group_members_select ON public.part_alternate_group_members
  FOR SELECT TO public
  USING (
    group_id IN (
      SELECT pag.id FROM public.part_alternate_groups pag
      WHERE public.can_access_inventory(pag.organization_id)
    )
  );

CREATE POLICY part_alternate_group_members_insert ON public.part_alternate_group_members
  FOR INSERT TO public
  WITH CHECK (
    group_id IN (
      SELECT pag.id FROM public.part_alternate_groups pag
      WHERE public.can_manage_inventory(pag.organization_id)
    )
  );

CREATE POLICY part_alternate_group_members_update ON public.part_alternate_group_members
  FOR UPDATE TO public
  USING (
    group_id IN (
      SELECT pag.id FROM public.part_alternate_groups pag
      WHERE public.can_manage_inventory(pag.organization_id)
    )
  );

CREATE POLICY part_alternate_group_members_delete ON public.part_alternate_group_members
  FOR DELETE TO public
  USING (
    group_id IN (
      SELECT pag.id FROM public.part_alternate_groups pag
      WHERE public.can_manage_inventory(pag.organization_id)
    )
  );

-- ============================================================================
-- PART 11: adjust_inventory_quantity — require manage permission
-- ============================================================================

CREATE OR REPLACE FUNCTION public.adjust_inventory_quantity(
  p_item_id UUID,
  p_delta INTEGER,
  p_reason TEXT,
  p_work_order_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_quantity INTEGER;
  v_new_quantity INTEGER;
  v_organization_id UUID;
  v_transaction_type inventory_transaction_type;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF p_delta = 0 THEN
    RAISE EXCEPTION 'Inventory adjustment delta cannot be zero';
  END IF;

  SELECT quantity_on_hand, organization_id
  INTO v_current_quantity, v_organization_id
  FROM public.inventory_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF v_current_quantity IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found: %', p_item_id;
  END IF;

  IF NOT public.can_manage_inventory(v_organization_id, v_user_id) THEN
    RAISE EXCEPTION 'User does not have permission to adjust inventory';
  END IF;

  v_new_quantity := v_current_quantity + p_delta;

  IF p_delta < 0 AND v_new_quantity < 0 THEN
    RAISE EXCEPTION 'Insufficient stock: requested % units, but only % available',
      ABS(p_delta), v_current_quantity;
  END IF;

  IF v_new_quantity < -1000 THEN
    RAISE WARNING 'Inventory item % for org % adjusted by user % to suspiciously low quantity: %',
      p_item_id, v_organization_id, v_user_id, v_new_quantity;
  END IF;

  IF p_work_order_id IS NOT NULL THEN
    v_transaction_type := 'work_order';
  ELSIF p_delta < 0 THEN
    v_transaction_type := 'usage';
  ELSIF p_delta > 0 THEN
    v_transaction_type := 'restock';
  END IF;

  UPDATE public.inventory_items
  SET
    quantity_on_hand = v_new_quantity,
    updated_at = NOW()
  WHERE id = p_item_id;

  INSERT INTO public.inventory_transactions (
    inventory_item_id,
    organization_id,
    user_id,
    previous_quantity,
    new_quantity,
    change_amount,
    transaction_type,
    work_order_id,
    notes
  ) VALUES (
    p_item_id,
    v_organization_id,
    v_user_id,
    v_current_quantity,
    v_new_quantity,
    p_delta,
    v_transaction_type,
    p_work_order_id,
    p_reason
  );

  RETURN v_new_quantity;
END;
$$;

-- ============================================================================
-- PART 12: Patch inventory lookup RPC membership checks
-- ============================================================================

CREATE OR REPLACE FUNCTION public.assert_inventory_read_access(p_organization_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required: no authenticated user context'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_access_inventory(p_organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: user cannot access inventory for this organization'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assert_inventory_read_access(UUID) TO authenticated;

-- get_alternates_for_inventory_item
CREATE OR REPLACE FUNCTION public.get_alternates_for_inventory_item(
  p_organization_id UUID,
  p_inventory_item_id UUID
)
RETURNS TABLE(
  group_id UUID,
  group_name TEXT,
  group_status public.verification_status,
  group_verified BOOLEAN,
  group_notes TEXT,
  identifier_id UUID,
  identifier_type public.part_identifier_type,
  identifier_value TEXT,
  identifier_manufacturer TEXT,
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
  is_primary BOOLEAN,
  is_source_item BOOLEAN
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  PERFORM public.assert_inventory_read_access(p_organization_id);

  RETURN QUERY
  WITH item_groups AS (
    SELECT DISTINCT pagm.group_id
    FROM public.part_alternate_group_members pagm
    WHERE pagm.inventory_item_id = p_inventory_item_id

    UNION

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
  WHERE pag.organization_id = p_organization_id;
END;
$$;

-- get_alternates_for_part_number (from 20260112000005 with inventory RBAC gate)
CREATE OR REPLACE FUNCTION public.get_alternates_for_part_number(
  p_organization_id UUID,
  p_part_number TEXT
)
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  group_status public.verification_status,
  group_verified BOOLEAN,
  group_notes TEXT,
  identifier_id UUID,
  identifier_type public.part_identifier_type,
  identifier_value TEXT,
  identifier_manufacturer TEXT,
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
  is_primary BOOLEAN,
  is_matching_input BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_norm_value TEXT;
  v_search_pattern TEXT;
BEGIN
  PERFORM public.assert_inventory_read_access(p_organization_id);

  v_norm_value := lower(trim(p_part_number));
  v_search_pattern := v_norm_value || '%';

  IF v_norm_value IS NULL OR v_norm_value = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH matching_identifiers AS (
    SELECT pi.id AS matched_id
    FROM public.part_identifiers pi
    WHERE pi.organization_id = p_organization_id
      AND (pi.norm_value = v_norm_value OR pi.norm_value ILIKE v_search_pattern)
  ),
  matching_groups AS (
    SELECT DISTINCT pagm.group_id
    FROM public.part_alternate_group_members pagm
    INNER JOIN matching_identifiers mi ON pagm.part_identifier_id = mi.matched_id

    UNION

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
  direct_inventory_matches AS (
    SELECT
      NULL::UUID AS group_id,
      'Direct Match (No Alternates Defined)'::TEXT AS group_name,
      'unverified'::public.verification_status AS group_status,
      FALSE AS group_verified,
      NULL::TEXT AS group_notes,
      NULL::UUID AS identifier_id,
      NULL::public.part_identifier_type AS identifier_type,
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
      TRUE AS is_primary,
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
      AND NOT EXISTS (
        SELECT 1 FROM public.part_alternate_group_members pagm
        WHERE pagm.inventory_item_id = ii.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.part_identifiers pi
        INNER JOIN public.part_alternate_group_members pagm ON pagm.part_identifier_id = pi.id
        WHERE pi.inventory_item_id = ii.id
      )
  ),
  combined_results AS (
    SELECT * FROM group_results
    UNION ALL
    SELECT * FROM direct_inventory_matches
  )
  SELECT * FROM combined_results cr
  ORDER BY
    cr.group_name NULLS LAST,
    cr.is_primary DESC,
    cr.is_in_stock DESC,
    cr.default_unit_cost ASC NULLS LAST,
    cr.inventory_name NULLS LAST;
END;
$$;

-- ============================================================================
-- PART 13: bulk_set_compatibility_rules — require manage permission
-- ============================================================================

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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required: no authenticated user context'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_manage_inventory(p_organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: user cannot manage inventory for this organization'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_items
    WHERE id = p_item_id
      AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Inventory item not found or access denied'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.part_compatibility_rules
  WHERE inventory_item_id = p_item_id;

  IF p_rules IS NOT NULL AND jsonb_array_length(p_rules) > 0 THEN
    FOR v_rule IN SELECT * FROM jsonb_array_elements(p_rules)
    LOOP
      v_manufacturer := v_rule->>'manufacturer';
      v_model := v_rule->>'model';

      IF v_manufacturer IS NOT NULL AND trim(v_manufacturer) <> '' THEN
        v_manufacturer_norm := lower(trim(v_manufacturer));

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

        IF v_match_type = 'any'::public.model_match_type THEN
          v_model_norm := NULL;
          v_pattern_raw := NULL;
          v_pattern_norm := NULL;
        ELSIF v_match_type = 'prefix'::public.model_match_type THEN
          v_pattern_raw := trim(v_model);
          v_pattern_norm := lower(v_pattern_raw);
          v_model_norm := v_pattern_norm;
        ELSIF v_match_type = 'wildcard'::public.model_match_type THEN
          v_pattern_raw := trim(v_model);
          v_pattern_norm := lower(replace(v_pattern_raw, '*', '%'));
          v_model_norm := NULL;
        ELSE
          v_model_norm := lower(trim(v_model));
          v_pattern_raw := NULL;
          v_pattern_norm := NULL;
        END IF;

        v_status := COALESCE((v_rule->>'status')::public.verification_status, 'unverified'::public.verification_status);
        v_notes := v_rule->>'notes';

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
          NULLIF(trim(v_model), ''),
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
              (pcr.model_norm IS NULL AND v_model_norm IS NULL)
              OR pcr.model_norm = v_model_norm
            )
        );

        IF FOUND THEN
          v_rules_count := v_rules_count + 1;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN v_rules_count;
END;
$$;

-- ============================================================================
-- PART 14: Org lifecycle — clean parts_consumers when membership ends
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_inventory_grants_on_member_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.parts_consumers
  WHERE organization_id = OLD.organization_id
    AND user_id = OLD.user_id;

  DELETE FROM public.parts_managers
  WHERE organization_id = OLD.organization_id
    AND user_id = OLD.user_id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS organization_members_cleanup_parts_consumers ON public.organization_members;
CREATE TRIGGER organization_members_cleanup_parts_consumers
  BEFORE DELETE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_inventory_grants_on_member_removal();

-- ============================================================================
-- PART 15: Remaining inventory read RPCs — require can_access_inventory
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_compatible_parts_for_equipment(
  p_organization_id UUID,
  p_equipment_ids UUID[]
)
RETURNS TABLE(
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
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.assert_inventory_read_access(p_organization_id);

  IF p_equipment_ids IS NULL OR array_length(p_equipment_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH compatible_parts AS (
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
        pcr.match_type = 'any'
        OR (pcr.match_type = 'exact' AND pcr.model_norm = lower(trim(e.model)))
        OR (pcr.match_type = 'prefix' AND lower(trim(e.model)) LIKE (pcr.model_pattern_norm || '%'))
        OR (pcr.match_type = 'wildcard' AND lower(trim(e.model)) LIKE pcr.model_pattern_norm)
        OR (pcr.model_norm IS NULL AND pcr.match_type = 'exact')
      )
    JOIN public.inventory_items ii ON ii.id = pcr.inventory_item_id
      AND ii.organization_id = p_organization_id
    WHERE e.id = ANY(p_equipment_ids)
      AND e.organization_id = p_organization_id
  ),
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
  SELECT
    pwa.inv_item_id,
    pwa.item_name,
    pwa.item_sku,
    pwa.item_external_id,
    pwa.item_qty,
    pwa.item_threshold,
    pwa.item_cost,
    pwa.item_location,
    pwa.item_image,
    pwa.item_match_type,
    pwa.item_has_alternates
  FROM parts_with_alternates pwa
  ORDER BY pwa.item_has_alternates DESC, pwa.item_cost ASC NULLS LAST, pwa.item_name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_compatible_parts_for_make_model(
  p_organization_id UUID,
  p_manufacturer TEXT,
  p_model TEXT DEFAULT NULL
)
RETURNS TABLE(
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
  rule_match_type public.model_match_type,
  rule_status public.verification_status,
  is_in_stock BOOLEAN,
  is_verified BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_mfr_norm TEXT;
  v_model_norm TEXT;
BEGIN
  PERFORM public.assert_inventory_read_access(p_organization_id);

  v_mfr_norm := lower(trim(COALESCE(p_manufacturer, '')));
  v_model_norm := lower(trim(COALESCE(p_model, '')));

  IF v_mfr_norm = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ii.id,
    ii.name,
    ii.sku,
    ii.external_id,
    ii.quantity_on_hand,
    ii.low_stock_threshold,
    ii.default_unit_cost,
    ii.location,
    ii.image_url,
    'rule'::TEXT,
    pcr.match_type,
    pcr.status,
    (ii.quantity_on_hand > 0),
    (pcr.status = 'verified')
  FROM public.part_compatibility_rules pcr
  JOIN public.inventory_items ii ON ii.id = pcr.inventory_item_id
    AND ii.organization_id = p_organization_id
  WHERE pcr.manufacturer_norm = v_mfr_norm
    AND (
      pcr.match_type = 'any'
      OR (pcr.match_type = 'exact' AND (v_model_norm = '' OR pcr.model_norm = v_model_norm))
      OR (pcr.match_type = 'prefix' AND v_model_norm <> '' AND v_model_norm LIKE (pcr.model_pattern_norm || '%'))
      OR (pcr.match_type = 'wildcard' AND v_model_norm <> '' AND v_model_norm LIKE pcr.model_pattern_norm)
      OR (pcr.model_norm IS NULL AND pcr.match_type = 'exact')
    )
  ORDER BY
    (pcr.status = 'verified') DESC,
    (ii.quantity_on_hand > 0) DESC,
    ii.default_unit_cost ASC NULLS LAST,
    ii.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_equipment_for_inventory_item_rules(
  p_organization_id UUID,
  p_item_id UUID
)
RETURNS TABLE(
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
  matched_rule_match_type public.model_match_type,
  matched_rule_status public.verification_status
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.assert_inventory_read_access(p_organization_id);

  RETURN QUERY
  SELECT DISTINCT ON (e.id)
    e.id,
    e.name::TEXT,
    e.manufacturer::TEXT,
    e.model::TEXT,
    e.serial_number::TEXT,
    e.status::TEXT,
    e.location::TEXT,
    pcr.id,
    pcr.manufacturer::TEXT,
    pcr.model::TEXT,
    pcr.match_type,
    pcr.status
  FROM public.equipment e
  JOIN public.part_compatibility_rules pcr
    ON pcr.manufacturer_norm = lower(trim(e.manufacturer))
    AND (
      pcr.match_type = 'any'
      OR (pcr.match_type = 'exact' AND pcr.model_norm = lower(trim(e.model)))
      OR (pcr.match_type = 'prefix' AND lower(trim(e.model)) LIKE (pcr.model_pattern_norm || '%'))
      OR (pcr.match_type = 'wildcard' AND lower(trim(e.model)) LIKE pcr.model_pattern_norm)
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

COMMIT;
