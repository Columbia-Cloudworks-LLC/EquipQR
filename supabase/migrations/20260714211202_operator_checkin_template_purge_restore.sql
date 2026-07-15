-- Issue #1263: purge unused operator check-in templates on delete, archive when
-- ledger submissions exist, and add restore path for archived templates.

CREATE INDEX IF NOT EXISTS idx_operator_checkin_submissions_template_id_organization_id
  ON public.operator_checkin_submissions (template_id, organization_id)
  WHERE template_id IS NOT NULL;

UPDATE public.operator_checkin_submissions AS submission
SET template_id = NULL
WHERE submission.template_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.operator_checklist_templates AS template
    WHERE template.id = submission.template_id
      AND template.organization_id = submission.organization_id
  );

ALTER TABLE public.operator_checklist_templates
  DROP CONSTRAINT IF EXISTS operator_checklist_templates_id_organization_id_key;

ALTER TABLE public.operator_checklist_templates
  ADD CONSTRAINT operator_checklist_templates_id_organization_id_key
  UNIQUE (id, organization_id);

ALTER TABLE public.operator_checkin_submissions
  DROP CONSTRAINT IF EXISTS operator_checkin_submissions_template_id_fkey;

ALTER TABLE public.operator_checkin_submissions
  DROP CONSTRAINT IF EXISTS operator_checkin_submissions_template_organization_fkey;

ALTER TABLE public.operator_checkin_submissions
  ADD CONSTRAINT operator_checkin_submissions_template_organization_fkey
  FOREIGN KEY (template_id, organization_id)
  REFERENCES public.operator_checklist_templates (id, organization_id)
  ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.validate_operator_checkin_submission_org_refs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.template_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.operator_checklist_templates tpl
      WHERE tpl.id = NEW.template_id
        AND tpl.organization_id = NEW.organization_id
    ) THEN
    RAISE EXCEPTION 'template submission organization mismatch';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_operator_checkin_submission_org_refs
  ON public.operator_checkin_submissions;

CREATE TRIGGER trg_validate_operator_checkin_submission_org_refs
  BEFORE INSERT OR UPDATE OF template_id, organization_id
  ON public.operator_checkin_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_operator_checkin_submission_org_refs();

REVOKE ALL ON FUNCTION public.validate_operator_checkin_submission_org_refs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_operator_checkin_submission_org_refs() FROM anon;
REVOKE ALL ON FUNCTION public.validate_operator_checkin_submission_org_refs() FROM authenticated;

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
  v_has_submissions boolean;
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

  SELECT EXISTS (
    SELECT 1
    FROM public.operator_checkin_submissions
    WHERE template_id = p_template_id
      AND organization_id = v_org_id
  ) INTO v_has_submissions;

  IF NOT v_has_submissions THEN
    IF EXISTS (
      SELECT 1
      FROM public.operator_checkin_submissions
      WHERE template_id = p_template_id
        AND organization_id IS DISTINCT FROM v_org_id
    ) THEN
      RAISE EXCEPTION 'Cannot purge template: cross-organization submission references detected';
    END IF;

    DELETE FROM public.equipment_operator_checkin_settings
    WHERE template_id = p_template_id
      AND organization_id = v_org_id;

    DELETE FROM public.operator_checklist_templates
    WHERE id = p_template_id
      AND organization_id = v_org_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.operator_checkin_submissions
        WHERE template_id = p_template_id
          AND organization_id = v_org_id
      );

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Template purge blocked: submissions exist';
    END IF;

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
  v_has_submissions boolean;
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

  SELECT EXISTS (
    SELECT 1
    FROM public.operator_checkin_submissions
    WHERE template_id = p_template_id
      AND organization_id = v_org_id
  ) INTO v_has_submissions;

  IF NOT v_has_submissions THEN
    IF EXISTS (
      SELECT 1
      FROM public.operator_checkin_submissions
      WHERE template_id = p_template_id
        AND organization_id IS DISTINCT FROM v_org_id
    ) THEN
      RAISE EXCEPTION 'Cannot restore template: cross-organization submission references detected';
    END IF;

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

-- rpc-authenticated-grant-allowed: list_operator_checkin_restorable_template_ids
CREATE OR REPLACE FUNCTION public.list_operator_checkin_restorable_template_ids(
  p_organization_id uuid,
  p_template_ids uuid[] DEFAULT NULL
)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_org_admin(auth.uid(), p_organization_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN COALESCE(
    ARRAY(
      SELECT DISTINCT submission.template_id
      FROM public.operator_checkin_submissions AS submission
      WHERE submission.organization_id = p_organization_id
        AND submission.template_id IS NOT NULL
        AND (
          p_template_ids IS NULL
          OR cardinality(p_template_ids) = 0
          OR submission.template_id = ANY(p_template_ids)
        )
    ),
    '{}'::uuid[]
  );
END;
$$;

REVOKE ALL ON FUNCTION public.list_operator_checkin_restorable_template_ids(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_operator_checkin_restorable_template_ids(uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.list_operator_checkin_restorable_template_ids(uuid, uuid[]) TO authenticated;
