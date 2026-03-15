-- ============================================================================
-- PM Interval Tracking
--
-- Adds interval fields to PM templates so equipment can be flagged when
-- preventive maintenance is overdue (by calendar days or working hours).
-- ============================================================================

-- 1. Schema: interval columns on pm_checklist_templates
ALTER TABLE public.pm_checklist_templates
  ADD COLUMN IF NOT EXISTS interval_value integer,
  ADD COLUMN IF NOT EXISTS interval_type  text;

ALTER TABLE public.pm_checklist_templates
  DROP CONSTRAINT IF EXISTS pm_template_interval_type_check;

ALTER TABLE public.pm_checklist_templates
  ADD CONSTRAINT pm_template_interval_type_check
  CHECK (interval_type IS NULL OR interval_type IN ('days', 'hours'));

ALTER TABLE public.pm_checklist_templates
  DROP CONSTRAINT IF EXISTS pm_template_interval_pair_check;

ALTER TABLE public.pm_checklist_templates
  ADD CONSTRAINT pm_template_interval_pair_check
  CHECK (
    (interval_value IS NULL AND interval_type IS NULL)
    OR (interval_value IS NOT NULL AND interval_type IS NOT NULL AND interval_value > 0)
  );

-- 2. Schema: snapshot of equipment working hours when PM is completed
ALTER TABLE public.preventative_maintenance
  ADD COLUMN IF NOT EXISTS equipment_working_hours_at_completion numeric;

-- 3. Trigger: capture working hours on PM completion
--    Fires on preventative_maintenance status changes, not work_orders.
CREATE OR REPLACE FUNCTION public.snapshot_pm_working_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hours numeric;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.equipment_working_hours_at_completion IS NULL
  THEN
    SELECT working_hours INTO v_hours
    FROM public.equipment
    WHERE id = NEW.equipment_id;

    IF v_hours IS NOT NULL THEN
      NEW.equipment_working_hours_at_completion := v_hours;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_snapshot_pm_working_hours ON public.preventative_maintenance;

CREATE TRIGGER tr_snapshot_pm_working_hours
BEFORE UPDATE OF status ON public.preventative_maintenance
FOR EACH ROW
EXECUTE FUNCTION public.snapshot_pm_working_hours();

-- 4. RPC: single-equipment PM status
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
BEGIN
  -- Find latest completed PM for this equipment
  SELECT pm.completed_at,
         pm.template_id,
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

  -- Try interval from the template used on the last PM
  IF v_last_pm.template_id IS NOT NULL THEN
    SELECT t.interval_value, t.interval_type, t.name
    INTO v_interval_value, v_interval_type, v_template_name
    FROM public.pm_checklist_templates t
    WHERE t.id = v_last_pm.template_id
      AND t.interval_value IS NOT NULL;

    IF v_interval_value IS NOT NULL THEN
      v_source := 'work_order_pm';
    END IF;
  END IF;

  -- Fallback: equipment's default PM template
  IF v_interval_value IS NULL THEN
    SELECT t.interval_value, t.interval_type, t.name
    INTO v_interval_value, v_interval_type, v_template_name
    FROM public.equipment e
    JOIN public.pm_checklist_templates t ON t.id = e.default_pm_template_id
    WHERE e.id = p_equipment_id
      AND t.interval_value IS NOT NULL;

    IF v_interval_value IS NOT NULL THEN
      v_source := 'equipment_default';
    END IF;
  END IF;

  -- No interval configured anywhere
  IF v_interval_value IS NULL THEN
    RETURN;
  END IF;

  -- Compute overdue
  IF v_interval_type = 'days' THEN
    v_days_overdue := EXTRACT(DAY FROM (now() - v_last_pm.completed_at))::integer - v_interval_value;
    v_is_overdue := v_days_overdue > 0;
    IF NOT v_is_overdue THEN v_days_overdue := NULL; END IF;

  ELSIF v_interval_type = 'hours' THEN
    SELECT working_hours INTO v_equipment_hours
    FROM public.equipment WHERE id = p_equipment_id;

    IF v_equipment_hours IS NOT NULL AND v_last_pm.equipment_working_hours_at_completion IS NOT NULL THEN
      v_hours_overdue := v_equipment_hours
                         - v_last_pm.equipment_working_hours_at_completion
                         - v_interval_value;
      v_is_overdue := v_hours_overdue > 0;
      IF NOT v_is_overdue THEN v_hours_overdue := NULL; END IF;
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
GRANT EXECUTE ON FUNCTION public.get_equipment_pm_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_equipment_pm_status(uuid) TO service_role;

-- 5. RPC: batch PM status for all equipment in an org
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
  -- Security: caller must be active org member
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
GRANT EXECUTE ON FUNCTION public.get_org_equipment_pm_statuses(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_equipment_pm_statuses(uuid) TO service_role;
