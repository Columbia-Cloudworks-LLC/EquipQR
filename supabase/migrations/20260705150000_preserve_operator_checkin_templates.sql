-- Preserve assigned operator daily check-in templates (#1137).
-- Repair drift where templates were marked inactive while equipment assignments stayed enabled,
-- and prevent that inconsistent state from being committed again.

BEGIN;

-- One-time repair for existing inconsistent rows.
UPDATE public.operator_checklist_templates AS t
SET is_active = true,
    updated_at = now()
WHERE t.is_active = false
  AND EXISTS (
    SELECT 1
    FROM public.equipment_operator_checkin_settings AS s
    WHERE s.template_id = t.id
      AND s.enabled = true
  );

CREATE OR REPLACE FUNCTION public.ensure_operator_template_active_for_enabled_assignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.enabled = true THEN
    UPDATE public.operator_checklist_templates
    SET is_active = true,
        updated_at = now()
    WHERE id = NEW.template_id
      AND is_active = false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_operator_template_active_for_enabled_assignment
  ON public.equipment_operator_checkin_settings;

CREATE TRIGGER trg_ensure_operator_template_active_for_enabled_assignment
  BEFORE INSERT OR UPDATE OF enabled, template_id
  ON public.equipment_operator_checkin_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_operator_template_active_for_enabled_assignment();

CREATE OR REPLACE FUNCTION public.prevent_inactive_operator_template_with_enabled_assignments()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = false AND COALESCE(OLD.is_active, true) = true THEN
    IF EXISTS (
      SELECT 1
      FROM public.equipment_operator_checkin_settings AS s
      WHERE s.template_id = NEW.id
        AND s.enabled = true
    ) THEN
      RAISE EXCEPTION
        'Cannot deactivate operator checklist template while enabled equipment assignments exist';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_inactive_operator_template_with_enabled_assignments
  ON public.operator_checklist_templates;

CREATE TRIGGER trg_prevent_inactive_operator_template_with_enabled_assignments
  BEFORE UPDATE OF is_active
  ON public.operator_checklist_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_inactive_operator_template_with_enabled_assignments();

-- rpc-authenticated-grant-allowed: delete_operator_checklist_template
CREATE OR REPLACE FUNCTION public.delete_operator_checklist_template(p_template_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_disabled_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT organization_id INTO v_org_id
  FROM public.operator_checklist_templates
  WHERE id = p_template_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  IF NOT public.is_org_admin(auth.uid(), v_org_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.equipment_operator_checkin_settings
  SET enabled = false,
      updated_at = now()
  WHERE template_id = p_template_id
    AND enabled = true;

  GET DIAGNOSTICS v_disabled_count = ROW_COUNT;

  UPDATE public.operator_checklist_templates
  SET is_active = false,
      updated_by = auth.uid(),
      updated_at = now()
  WHERE id = p_template_id;

  RETURN v_disabled_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_operator_checklist_template(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_operator_checklist_template(uuid) TO authenticated;

COMMIT;
