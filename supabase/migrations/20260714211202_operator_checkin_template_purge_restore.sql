-- Issue #1263: purge unused operator check-in templates on delete, archive when
-- ledger submissions exist, and add restore path for archived templates.

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
  v_submission_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT organization_id INTO v_org_id
  FROM public.operator_checklist_templates
  WHERE id = p_template_id
  FOR UPDATE;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  IF NOT public.is_org_admin(auth.uid(), v_org_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT count(*)::integer INTO v_submission_count
  FROM public.operator_checkin_submissions
  WHERE template_id = p_template_id
    AND organization_id = v_org_id;

  IF v_submission_count = 0 THEN
    DELETE FROM public.equipment_operator_checkin_settings
    WHERE template_id = p_template_id
      AND organization_id = v_org_id;

    DELETE FROM public.operator_checklist_templates
    WHERE id = p_template_id
      AND organization_id = v_org_id;

    RETURN -1;
  END IF;

  UPDATE public.equipment_operator_checkin_settings
  SET enabled = false,
      updated_at = now()
  WHERE template_id = p_template_id
    AND organization_id = v_org_id
    AND enabled = true;

  GET DIAGNOSTICS v_disabled_count = ROW_COUNT;

  UPDATE public.operator_checklist_templates
  SET is_active = false,
      updated_by = auth.uid(),
      updated_at = now()
  WHERE id = p_template_id
    AND organization_id = v_org_id;

  RETURN v_disabled_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_operator_checklist_template(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_operator_checklist_template(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_operator_checklist_template(uuid) TO authenticated;

-- rpc-authenticated-grant-allowed: restore_operator_checklist_template
CREATE OR REPLACE FUNCTION public.restore_operator_checklist_template(p_template_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_submission_count integer;
  v_reenabled_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT organization_id INTO v_org_id
  FROM public.operator_checklist_templates
  WHERE id = p_template_id
  FOR UPDATE;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  IF NOT public.is_org_admin(auth.uid(), v_org_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF (SELECT is_active FROM public.operator_checklist_templates WHERE id = p_template_id) THEN
    RAISE EXCEPTION 'Template is already active';
  END IF;

  SELECT count(*)::integer INTO v_submission_count
  FROM public.operator_checkin_submissions
  WHERE template_id = p_template_id
    AND organization_id = v_org_id;

  IF v_submission_count = 0 THEN
    RAISE EXCEPTION 'Cannot restore template without ledger submissions';
  END IF;

  UPDATE public.operator_checklist_templates
  SET is_active = true,
      updated_by = auth.uid(),
      updated_at = now()
  WHERE id = p_template_id
    AND organization_id = v_org_id;

  UPDATE public.equipment_operator_checkin_settings
  SET enabled = true,
      updated_at = now()
  WHERE template_id = p_template_id
    AND organization_id = v_org_id
    AND enabled = false;

  GET DIAGNOSTICS v_reenabled_count = ROW_COUNT;

  RETURN v_reenabled_count;
END;
$$;

REVOKE ALL ON FUNCTION public.restore_operator_checklist_template(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_operator_checklist_template(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.restore_operator_checklist_template(uuid) TO authenticated;
