-- rpc-authenticated-grant-allowed: get_effective_pm_interval_policy_for_equipment
CREATE OR REPLACE FUNCTION public.get_effective_pm_interval_policy_for_equipment(p_equipment_id uuid)
RETURNS TABLE(
  interval_value integer,
  interval_type text,
  template_name text,
  source text,
  schedule_mode text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_equipment_org_id uuid;
  v_team_id uuid;
  v_template_id uuid;
  v_template_name text;
  v_policy record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT e.organization_id, e.team_id, e.default_pm_template_id
  INTO v_equipment_org_id, v_team_id, v_template_id
  FROM public.equipment e
  WHERE e.id = p_equipment_id;

  IF v_equipment_org_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = v_equipment_org_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: not an active member of this organization'
      USING ERRCODE = '42501';
  END IF;

  IF v_template_id IS NOT NULL THEN
    SELECT t.name
    INTO v_template_name
    FROM public.pm_checklist_templates t
    WHERE t.id = v_template_id;
  END IF;

  SELECT p.schedule_mode, p.interval_value, p.interval_type
  INTO v_policy
  FROM public.pm_interval_policies p
  WHERE p.organization_id = v_equipment_org_id
    AND p.equipment_id = p_equipment_id
    AND p.policy_slot = 'default'
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY
    SELECT
      v_policy.interval_value,
      v_policy.interval_type,
      COALESCE(v_template_name, 'Equipment schedule'),
      'equipment_policy'::text,
      v_policy.schedule_mode;
    RETURN;
  END IF;

  IF v_team_id IS NOT NULL THEN
    SELECT p.schedule_mode, p.interval_value, p.interval_type
    INTO v_policy
    FROM public.pm_interval_policies p
    WHERE p.organization_id = v_equipment_org_id
      AND p.team_id = v_team_id
      AND p.policy_slot = 'default'
    LIMIT 1;

    IF FOUND THEN
      RETURN QUERY
      SELECT
        v_policy.interval_value,
        v_policy.interval_type,
        COALESCE(v_template_name, 'Team schedule'),
        'team_policy'::text,
        v_policy.schedule_mode;
      RETURN;
    END IF;
  END IF;

  IF v_template_id IS NOT NULL THEN
    SELECT p.schedule_mode, p.interval_value, p.interval_type
    INTO v_policy
    FROM public.pm_interval_policies p
    WHERE p.organization_id = v_equipment_org_id
      AND p.pm_template_id = v_template_id
      AND p.policy_slot = 'default'
    LIMIT 1;

    IF FOUND THEN
      RETURN QUERY
      SELECT
        v_policy.interval_value,
        v_policy.interval_type,
        COALESCE(v_template_name, 'Template schedule'),
        'template_policy'::text,
        v_policy.schedule_mode;
      RETURN;
    END IF;

    SELECT t.interval_value, t.interval_type, t.name
    INTO v_policy.interval_value, v_policy.interval_type, v_template_name
    FROM public.pm_checklist_templates t
    WHERE t.id = v_template_id
      AND t.interval_value IS NOT NULL;

    IF v_policy.interval_value IS NOT NULL THEN
      RETURN QUERY
      SELECT
        v_policy.interval_value,
        v_policy.interval_type,
        v_template_name,
        'template_default'::text,
        'custom'::text;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    NULL::integer,
    NULL::text,
    NULL::text,
    'unconfigured'::text,
    'unconfigured'::text;
END;
$$;

ALTER FUNCTION public.get_effective_pm_interval_policy_for_equipment(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_effective_pm_interval_policy_for_equipment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_effective_pm_interval_policy_for_equipment(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_effective_pm_interval_policy_for_equipment(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_pm_interval_policy_for_equipment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_pm_interval_policy_for_equipment(uuid) TO service_role;
