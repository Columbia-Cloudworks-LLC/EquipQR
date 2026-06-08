-- ============================================================================
-- PM Interval Policies
--
-- Hierarchical maintenance interval policies for equipment, teams, and
-- templates. Equipment overrides team; team overrides template; template
-- policy or legacy template columns provide the default.
-- ============================================================================

-- 1. Policy table
CREATE TABLE IF NOT EXISTS public.pm_interval_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope_type text NOT NULL,
  equipment_id uuid REFERENCES public.equipment(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  pm_template_id uuid REFERENCES public.pm_checklist_templates(id) ON DELETE CASCADE,
  policy_slot text NOT NULL DEFAULT 'default',
  schedule_mode text NOT NULL,
  interval_value integer,
  interval_type text,
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pm_interval_policy_scope_type_check
    CHECK (scope_type IN ('equipment', 'team', 'template')),
  CONSTRAINT pm_interval_policy_schedule_mode_check
    CHECK (schedule_mode IN ('custom', 'none')),
  CONSTRAINT pm_interval_policy_scope_target_check
    CHECK (
      (scope_type = 'equipment' AND equipment_id IS NOT NULL AND team_id IS NULL AND pm_template_id IS NULL)
      OR (scope_type = 'team' AND team_id IS NOT NULL AND equipment_id IS NULL AND pm_template_id IS NULL)
      OR (scope_type = 'template' AND pm_template_id IS NOT NULL AND equipment_id IS NULL AND team_id IS NULL)
    ),
  CONSTRAINT pm_interval_policy_interval_type_check
    CHECK (interval_type IS NULL OR interval_type IN ('days', 'hours')),
  CONSTRAINT pm_interval_policy_interval_pair_check
    CHECK (
      (schedule_mode = 'none' AND interval_value IS NULL AND interval_type IS NULL)
      OR (
        schedule_mode = 'custom'
        AND interval_value IS NOT NULL
        AND interval_type IS NOT NULL
        AND interval_value > 0
      )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS pm_interval_policies_equipment_slot_uidx
  ON public.pm_interval_policies (organization_id, equipment_id, policy_slot)
  WHERE equipment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pm_interval_policies_team_slot_uidx
  ON public.pm_interval_policies (organization_id, team_id, policy_slot)
  WHERE team_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pm_interval_policies_template_slot_uidx
  ON public.pm_interval_policies (organization_id, pm_template_id, policy_slot)
  WHERE pm_template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pm_interval_policies_org
  ON public.pm_interval_policies (organization_id);

CREATE INDEX IF NOT EXISTS idx_pm_interval_policies_equipment
  ON public.pm_interval_policies (equipment_id)
  WHERE equipment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pm_interval_policies_team
  ON public.pm_interval_policies (team_id)
  WHERE team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pm_interval_policies_template
  ON public.pm_interval_policies (organization_id, pm_template_id)
  WHERE pm_template_id IS NOT NULL;

ALTER TABLE public.pm_interval_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pm_interval_policies_select ON public.pm_interval_policies;
CREATE POLICY pm_interval_policies_select ON public.pm_interval_policies
FOR SELECT USING (
  organization_id IN (
    SELECT om.organization_id
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.status = 'active'
  )
);

DROP POLICY IF EXISTS pm_interval_policies_insert ON public.pm_interval_policies;
CREATE POLICY pm_interval_policies_insert ON public.pm_interval_policies
FOR INSERT WITH CHECK (
  public.is_org_admin(auth.uid(), organization_id)
  AND (
    equipment_id IS NULL
    OR equipment_id IN (
      SELECT e.id
      FROM public.equipment e
      WHERE e.organization_id = pm_interval_policies.organization_id
    )
  )
  AND (
    team_id IS NULL
    OR team_id IN (
      SELECT t.id
      FROM public.teams t
      WHERE t.organization_id = pm_interval_policies.organization_id
    )
  )
  AND (
    pm_template_id IS NULL
    OR pm_template_id IN (
      SELECT t.id
      FROM public.pm_checklist_templates t
      WHERE t.organization_id IS NULL
         OR t.organization_id = pm_interval_policies.organization_id
    )
  )
);

DROP POLICY IF EXISTS pm_interval_policies_update ON public.pm_interval_policies;
CREATE POLICY pm_interval_policies_update ON public.pm_interval_policies
FOR UPDATE USING (
  public.is_org_admin(auth.uid(), organization_id)
)
WITH CHECK (
  public.is_org_admin(auth.uid(), organization_id)
  AND (
    equipment_id IS NULL
    OR equipment_id IN (
      SELECT e.id
      FROM public.equipment e
      WHERE e.organization_id = pm_interval_policies.organization_id
    )
  )
  AND (
    team_id IS NULL
    OR team_id IN (
      SELECT t.id
      FROM public.teams t
      WHERE t.organization_id = pm_interval_policies.organization_id
    )
  )
  AND (
    pm_template_id IS NULL
    OR pm_template_id IN (
      SELECT t.id
      FROM public.pm_checklist_templates t
      WHERE t.organization_id IS NULL
         OR t.organization_id = pm_interval_policies.organization_id
    )
  )
);

DROP POLICY IF EXISTS pm_interval_policies_delete ON public.pm_interval_policies;
CREATE POLICY pm_interval_policies_delete ON public.pm_interval_policies
FOR DELETE USING (
  public.is_org_admin(auth.uid(), organization_id)
);

-- 2. Backfill org-owned template intervals into template-scoped policies
INSERT INTO public.pm_interval_policies (
  organization_id,
  scope_type,
  pm_template_id,
  policy_slot,
  schedule_mode,
  interval_value,
  interval_type,
  created_by,
  updated_by
)
SELECT
  t.organization_id,
  'template',
  t.id,
  'default',
  'custom',
  t.interval_value,
  t.interval_type,
  t.created_by,
  COALESCE(t.updated_by, t.created_by)
FROM public.pm_checklist_templates t
WHERE t.organization_id IS NOT NULL
  AND t.interval_value IS NOT NULL
  AND t.interval_type IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Resolver: effective interval policy for one equipment record
CREATE OR REPLACE FUNCTION public.resolve_effective_pm_interval_policy(p_equipment_id uuid)
RETURNS TABLE(
  interval_value integer,
  interval_type text,
  template_name text,
  source text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id           uuid;
  v_team_id          uuid;
  v_template_id      uuid;
  v_template_name    text;
  v_policy           record;
BEGIN
  SELECT e.organization_id, e.team_id, e.default_pm_template_id
  INTO v_org_id, v_team_id, v_template_id
  FROM public.equipment e
  WHERE e.id = p_equipment_id;

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  IF v_template_id IS NOT NULL THEN
    SELECT t.name
    INTO v_template_name
    FROM public.pm_checklist_templates t
    WHERE t.id = v_template_id;
  END IF;

  -- Equipment policy
  SELECT p.schedule_mode, p.interval_value, p.interval_type
  INTO v_policy
  FROM public.pm_interval_policies p
  WHERE p.organization_id = v_org_id
    AND p.equipment_id = p_equipment_id
    AND p.policy_slot = 'default'
  LIMIT 1;

  IF FOUND THEN
    IF v_policy.schedule_mode = 'none' THEN
      RETURN;
    END IF;

    RETURN QUERY
    SELECT
      v_policy.interval_value,
      v_policy.interval_type,
      COALESCE(v_template_name, 'Equipment schedule'),
      'equipment_policy'::text;
    RETURN;
  END IF;

  -- Team policy
  IF v_team_id IS NOT NULL THEN
    SELECT p.schedule_mode, p.interval_value, p.interval_type
    INTO v_policy
    FROM public.pm_interval_policies p
    WHERE p.organization_id = v_org_id
      AND p.team_id = v_team_id
      AND p.policy_slot = 'default'
    LIMIT 1;

    IF FOUND THEN
      IF v_policy.schedule_mode = 'none' THEN
        RETURN;
      END IF;

      RETURN QUERY
      SELECT
        v_policy.interval_value,
        v_policy.interval_type,
        COALESCE(v_template_name, 'Team schedule'),
        'team_policy'::text;
      RETURN;
    END IF;
  END IF;

  -- Template policy (org-scoped row for default template)
  IF v_template_id IS NOT NULL THEN
    SELECT p.schedule_mode, p.interval_value, p.interval_type
    INTO v_policy
    FROM public.pm_interval_policies p
    WHERE p.organization_id = v_org_id
      AND p.pm_template_id = v_template_id
      AND p.policy_slot = 'default'
    LIMIT 1;

    IF FOUND THEN
      IF v_policy.schedule_mode = 'none' THEN
        RETURN;
      END IF;

      RETURN QUERY
      SELECT
        v_policy.interval_value,
        v_policy.interval_type,
        COALESCE(v_template_name, 'Template schedule'),
        'template_policy'::text;
      RETURN;
    END IF;

    -- Legacy template column fallback
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
        'template_default'::text;
      RETURN;
    END IF;
  END IF;

  RETURN;
END;
$$;

ALTER FUNCTION public.resolve_effective_pm_interval_policy(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.resolve_effective_pm_interval_policy(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_effective_pm_interval_policy(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.resolve_effective_pm_interval_policy(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_effective_pm_interval_policy(uuid) TO service_role;

-- 4. PM status RPCs use policy hierarchy; latest PM is anchor only
CREATE OR REPLACE FUNCTION public.get_equipment_pm_status(p_equipment_id uuid)
RETURNS TABLE(
  equipment_id       uuid,
  last_pm_completed_at timestamptz,
  interval_value     integer,
  interval_type      text,
  is_overdue         boolean,
  days_overdue       integer,
  hours_overdue      numeric,
  template_name      text,
  source             text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_pm              record;
  v_interval_value       integer;
  v_interval_type        text;
  v_template_name        text;
  v_source               text;
  v_is_overdue           boolean := false;
  v_days_overdue         integer;
  v_hours_overdue        numeric;
  v_equipment_hours      numeric;
  v_equipment_org_id     uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT e.organization_id INTO v_equipment_org_id
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

  SELECT pm.completed_at,
         pm.equipment_working_hours_at_completion
  INTO v_last_pm
  FROM public.preventative_maintenance pm
  WHERE pm.equipment_id = p_equipment_id
    AND pm.status = 'completed'
    AND pm.completed_at IS NOT NULL
  ORDER BY pm.completed_at DESC
  LIMIT 1;

  IF v_last_pm IS NULL THEN
    RETURN;
  END IF;

  SELECT r.interval_value, r.interval_type, r.template_name, r.source
  INTO v_interval_value, v_interval_type, v_template_name, v_source
  FROM public.resolve_effective_pm_interval_policy(p_equipment_id) r
  LIMIT 1;

  IF v_interval_value IS NULL THEN
    RETURN;
  END IF;

  IF v_interval_type = 'days' THEN
    v_days_overdue := (now()::date - v_last_pm.completed_at::date) - v_interval_value;
    v_is_overdue := v_days_overdue > 0;

  ELSIF v_interval_type = 'hours' THEN
    SELECT working_hours INTO v_equipment_hours
    FROM public.equipment WHERE id = p_equipment_id;

    IF v_equipment_hours IS NOT NULL AND v_last_pm.equipment_working_hours_at_completion IS NOT NULL THEN
      v_hours_overdue := v_equipment_hours
                         - v_last_pm.equipment_working_hours_at_completion
                         - v_interval_value;
      v_is_overdue := v_hours_overdue > 0;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    p_equipment_id,
    v_last_pm.completed_at,
    v_interval_value,
    v_interval_type,
    v_is_overdue,
    v_days_overdue,
    v_hours_overdue,
    v_template_name,
    v_source;
END;
$$;

ALTER FUNCTION public.get_equipment_pm_status(uuid) OWNER TO postgres;
-- rpc-authenticated-grant-allowed: get_equipment_pm_status
GRANT EXECUTE ON FUNCTION public.get_equipment_pm_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_equipment_pm_status(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_org_equipment_pm_statuses(p_organization_id uuid)
RETURNS TABLE(
  equipment_id       uuid,
  last_pm_completed_at timestamptz,
  interval_value     integer,
  interval_type      text,
  is_overdue         boolean,
  days_overdue       integer,
  hours_overdue      numeric,
  template_name      text,
  source             text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: not an active member of this organization'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT s.*
  FROM public.equipment e
  CROSS JOIN LATERAL public.get_equipment_pm_status(e.id) s
  WHERE e.organization_id = p_organization_id;
END;
$$;

ALTER FUNCTION public.get_org_equipment_pm_statuses(uuid) OWNER TO postgres;
-- rpc-authenticated-grant-allowed: get_org_equipment_pm_statuses
GRANT EXECUTE ON FUNCTION public.get_org_equipment_pm_statuses(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_equipment_pm_statuses(uuid) TO service_role;
