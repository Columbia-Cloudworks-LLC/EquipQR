-- Fix product onboarding eligibility: skip established orgs (teams + equipment)
-- even when product_onboarding_completed_at is NULL (e.g. after seed re-run).

CREATE OR REPLACE FUNCTION public.get_product_onboarding_status(p_organization_id uuid)
RETURNS TABLE(
  needs_onboarding boolean,
  teams_count bigint,
  equipment_count bigint,
  completed_at timestamptz,
  is_org_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_status text;
  v_completed_at timestamptz;
  v_teams_count bigint := 0;
  v_equipment_count bigint := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT om.role, om.status, om.product_onboarding_completed_at
  INTO v_role, v_status, v_completed_at
  FROM public.organization_members om
  WHERE om.organization_id = p_organization_id
    AND om.user_id = v_user_id
  LIMIT 1;

  IF v_role IS NULL OR v_status IS DISTINCT FROM 'active' THEN
    needs_onboarding := false;
    teams_count := 0;
    equipment_count := 0;
    completed_at := NULL;
    is_org_admin := false;
    RETURN NEXT;
    RETURN;
  END IF;

  is_org_admin := v_role IN ('owner', 'admin');
  completed_at := v_completed_at;

  SELECT COUNT(*)::bigint INTO v_teams_count
  FROM public.teams t
  WHERE t.organization_id = p_organization_id;

  SELECT COUNT(*)::bigint INTO v_equipment_count
  FROM public.equipment e
  WHERE e.organization_id = p_organization_id;

  teams_count := v_teams_count;
  equipment_count := v_equipment_count;

  needs_onboarding := is_org_admin
    AND v_completed_at IS NULL
    AND NOT (v_teams_count > 0 AND v_equipment_count > 0);

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.get_product_onboarding_status(uuid) IS
  'Returns whether the current user must complete product onboarding for the given organization. Established orgs with teams and equipment bypass the wizard even when completed_at is NULL.';

-- Re-run idempotent backfill for rows missed when migration ran before seeds.
UPDATE public.organization_members om
SET product_onboarding_completed_at = COALESCE(om.product_onboarding_completed_at, NOW())
WHERE om.role IN ('owner', 'admin')
  AND om.status = 'active'
  AND om.product_onboarding_completed_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.teams t WHERE t.organization_id = om.organization_id
  )
  AND EXISTS (
    SELECT 1 FROM public.equipment e WHERE e.organization_id = om.organization_id
  );

REVOKE ALL ON FUNCTION public.get_product_onboarding_status(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_product_onboarding_status(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.get_product_onboarding_status(uuid) TO authenticated, service_role;

-- rpc-authenticated-grant-allowed: get_product_onboarding_status
