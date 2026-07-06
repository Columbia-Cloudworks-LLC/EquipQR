-- ============================================================================
-- Restrict work_order_costs visibility to operational roles (issue: customer
-- roles must be oblivious to parts, pricing, and labor data).
--
-- Before this migration:
--   * SELECT on work_order_costs was allowed for ANY active org member,
--     including team requestors/viewers (customer-facing roles) and plain
--     members. Cost line items carry part names, unit prices, and labor
--     hours/rates — none of which limited roles may see.
--   * INSERT/UPDATE/DELETE "consolidated" policies allowed any authenticated
--     user to mutate rows where created_by = auth.uid() WITHOUT verifying org
--     membership or the target work order's organization (cross-tenant insert
--     surface).
--
-- After this migration:
--   * A single SECURITY DEFINER helper, can_access_work_order_costs, decides
--     cost-row access per work order: org owner/admin, the work order
--     assignee, or a team owner/manager/technician on the work order's team.
--     Requestors, viewers, and plain members are denied.
--   * All four work_order_costs policies are rebuilt on top of that helper.
--   * adjust_inventory_quantity additionally allows Parts Consumers to make
--     work-order-scoped adjustments (consume + restore) when they also hold
--     operational access to that work order, and validates that the work
--     order belongs to the same organization as the inventory item.
--
-- Down migration (manual revert):
--   * DROP POLICY the four policies below and recreate the baseline
--     "work_order_costs_select/insert/update/delete_consolidated" policies
--     from 20260114000000_baseline.sql.
--   * DROP FUNCTION public.can_access_work_order_costs(uuid, uuid).
--   * Recreate adjust_inventory_quantity from
--     20260629220803_add_parts_consumers_inventory_rbac.sql PART 11.
-- ============================================================================

-- ============================================================================
-- PART 1: Helper — can the user see/manage cost rows for this work order?
-- ============================================================================
-- rpc-authenticated-grant-allowed: can_access_work_order_costs

CREATE OR REPLACE FUNCTION public.can_access_work_order_costs(
  p_work_order_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.work_orders wo
    WHERE wo.id = p_work_order_id
      AND (
        public.is_org_admin(p_user_id, wo.organization_id)
        OR (
          public.is_org_member(p_user_id, wo.organization_id)
          AND (
            wo.assignee_id = p_user_id
            OR (
              wo.team_id IS NOT NULL
              AND EXISTS (
                SELECT 1
                FROM public.team_members tm
                WHERE tm.team_id = wo.team_id
                  AND tm.user_id = p_user_id
                  AND tm.role::text IN ('owner', 'manager', 'technician')
              )
            )
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_work_order_costs(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_work_order_costs(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_work_order_costs(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.can_access_work_order_costs IS
  'True when the user may see or manage cost line items (parts, pricing, labor) for the work order: org owner/admin, the work order assignee, or team owner/manager/technician on the work order''s team. Team requestors/viewers and plain org members are denied — customer-facing roles must stay oblivious to internal costing.';

-- ============================================================================
-- PART 2: Rebuild work_order_costs RLS policies
-- ============================================================================

ALTER TABLE public.work_order_costs ENABLE ROW LEVEL SECURITY;

-- NOTE: policy names keep the live "_consolidated" suffix from the advisor
-- dedup migration (20260401120000) so pgTAP advisor assertions (test 08:
-- non-consolidated names stay dropped) remain valid.

-- SELECT: operational access only (was: any active org member)
DROP POLICY IF EXISTS "work_order_costs_select" ON public.work_order_costs;
DROP POLICY IF EXISTS "work_order_costs_select_consolidated" ON public.work_order_costs;
CREATE POLICY "work_order_costs_select_consolidated" ON public.work_order_costs
  FOR SELECT
  USING (
    public.can_access_work_order_costs(work_order_id, (SELECT auth.uid()))
  );

COMMENT ON POLICY "work_order_costs_select_consolidated" ON public.work_order_costs IS
  'Only org owners/admins, the work order assignee, or team owner/manager/technician on the work order''s team can read cost rows. Requestors, viewers, and plain members see nothing.';

-- INSERT: must author the row AND hold operational access
-- (was: org admin OR any authenticated created_by = self, with no org check)
DROP POLICY IF EXISTS "work_order_costs_insert" ON public.work_order_costs;
DROP POLICY IF EXISTS "work_order_costs_insert_consolidated" ON public.work_order_costs;
CREATE POLICY "work_order_costs_insert_consolidated" ON public.work_order_costs
  FOR INSERT
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.can_access_work_order_costs(work_order_id, (SELECT auth.uid()))
  );

-- UPDATE: org admins may update any row; authors may update their own rows
-- while they still hold operational access to the work order
DROP POLICY IF EXISTS "work_order_costs_update" ON public.work_order_costs;
DROP POLICY IF EXISTS "work_order_costs_update_consolidated" ON public.work_order_costs;
CREATE POLICY "work_order_costs_update_consolidated" ON public.work_order_costs
  FOR UPDATE
  USING (
    public.can_access_work_order_costs(work_order_id, (SELECT auth.uid()))
    AND (
      created_by = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.work_orders wo
        WHERE wo.id = work_order_costs.work_order_id
          AND public.is_org_admin((SELECT auth.uid()), wo.organization_id)
      )
    )
  )
  WITH CHECK (
    public.can_access_work_order_costs(work_order_id, (SELECT auth.uid()))
    AND (
      created_by = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.work_orders wo
        WHERE wo.id = work_order_costs.work_order_id
          AND public.is_org_admin((SELECT auth.uid()), wo.organization_id)
      )
    )
  );

-- DELETE: same shape as UPDATE
DROP POLICY IF EXISTS "work_order_costs_delete" ON public.work_order_costs;
DROP POLICY IF EXISTS "work_order_costs_delete_consolidated" ON public.work_order_costs;
CREATE POLICY "work_order_costs_delete_consolidated" ON public.work_order_costs
  FOR DELETE
  USING (
    public.can_access_work_order_costs(work_order_id, (SELECT auth.uid()))
    AND (
      created_by = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.work_orders wo
        WHERE wo.id = work_order_costs.work_order_id
          AND public.is_org_admin((SELECT auth.uid()), wo.organization_id)
      )
    )
  );

-- ============================================================================
-- PART 3: adjust_inventory_quantity — allow Parts Consumers for work-order-
--         scoped consumption/restoration; validate work order organization
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
  v_work_order_org_id UUID;
  v_transaction_type inventory_transaction_type;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF p_delta IS NULL THEN
    RAISE EXCEPTION 'Inventory adjustment delta cannot be null';
  END IF;

  IF p_delta = 0 THEN
    RAISE EXCEPTION 'Inventory adjustment delta cannot be zero';
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  SELECT quantity_on_hand, organization_id
  INTO v_current_quantity, v_organization_id
  FROM public.inventory_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF v_current_quantity IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found: %', p_item_id;
  END IF;

  IF p_work_order_id IS NOT NULL THEN
    SELECT organization_id
    INTO v_work_order_org_id
    FROM public.work_orders
    WHERE id = p_work_order_id;

    IF v_work_order_org_id IS NULL OR v_work_order_org_id <> v_organization_id THEN
      RAISE EXCEPTION 'Work order does not belong to the inventory item organization';
    END IF;
  END IF;

  -- Parts Managers (and org owners/admins) may adjust freely. Parts Consumers
  -- may only make work-order-scoped adjustments (consume/restore) on work
  -- orders they hold operational cost access to.
  IF NOT public.can_manage_inventory(v_organization_id, v_user_id) THEN
    IF p_work_order_id IS NULL
       OR NOT public.can_access_inventory(v_organization_id, v_user_id)
       OR NOT public.can_access_work_order_costs(p_work_order_id, v_user_id) THEN
      RAISE EXCEPTION 'User does not have permission to adjust inventory';
    END IF;
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

COMMENT ON FUNCTION public.adjust_inventory_quantity IS
  'Adjusts inventory quantity with transaction logging. Parts Managers (and org owners/admins) may adjust freely; Parts Consumers may only make work-order-scoped adjustments on work orders where they hold operational cost access. The work order must belong to the same organization as the inventory item.';
