-- Safe operator checklist template deletion: archive templates, disable QR assignments,
-- preserve historical submissions, and prevent cascade data loss.

BEGIN;

ALTER TABLE public.operator_checkin_submissions
  ALTER COLUMN settings_id DROP NOT NULL;

ALTER TABLE public.operator_checkin_submissions
  DROP CONSTRAINT IF EXISTS operator_checkin_submissions_settings_id_fkey;

ALTER TABLE public.operator_checkin_submissions
  ADD CONSTRAINT operator_checkin_submissions_settings_id_fkey
  FOREIGN KEY (settings_id)
  REFERENCES public.equipment_operator_checkin_settings(id)
  ON DELETE SET NULL;

ALTER TABLE public.equipment_operator_checkin_settings
  DROP CONSTRAINT IF EXISTS equipment_operator_checkin_settings_template_id_fkey;

ALTER TABLE public.equipment_operator_checkin_settings
  ADD CONSTRAINT equipment_operator_checkin_settings_template_id_fkey
  FOREIGN KEY (template_id)
  REFERENCES public.operator_checklist_templates(id)
  ON DELETE RESTRICT;

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

  UPDATE public.operator_checklist_templates
  SET is_active = false,
      updated_by = auth.uid(),
      updated_at = now()
  WHERE id = p_template_id;

  UPDATE public.equipment_operator_checkin_settings
  SET enabled = false,
      updated_at = now()
  WHERE template_id = p_template_id
    AND enabled = true;

  GET DIAGNOSTICS v_disabled_count = ROW_COUNT;

  RETURN v_disabled_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_operator_checklist_template(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_operator_checklist_template(uuid) TO authenticated;

COMMIT;
