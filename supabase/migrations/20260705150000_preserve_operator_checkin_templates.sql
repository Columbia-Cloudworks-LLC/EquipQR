-- Preserve assigned operator daily check-in templates (#1137).
-- Repair drift where templates were marked inactive while equipment assignments stayed enabled,
-- prevent that inconsistent state from being committed again, and enforce org-scoped template links.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS idx_operator_checklist_templates_id_org
  ON public.operator_checklist_templates (id, organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_equipment_id_org
  ON public.equipment (id, organization_id);

-- Backfill organization_id when equipment and template agree on the same org.
UPDATE public.equipment_operator_checkin_settings AS s
SET organization_id = e.organization_id,
    updated_at = now()
FROM public.equipment AS e,
     public.operator_checklist_templates AS tpl
WHERE e.id = s.equipment_id
  AND tpl.id = s.template_id
  AND tpl.organization_id = e.organization_id
  AND s.organization_id IS DISTINCT FROM e.organization_id;

-- Drop only unreconcilable legacy rows before composite FK validation.
DELETE FROM public.equipment_operator_checkin_settings AS s
WHERE NOT EXISTS (
    SELECT 1
    FROM public.equipment AS e
    WHERE e.id = s.equipment_id
      AND e.organization_id = s.organization_id
  )
   OR NOT EXISTS (
    SELECT 1
    FROM public.operator_checklist_templates AS tpl
    WHERE tpl.id = s.template_id
      AND tpl.organization_id = s.organization_id
  );

ALTER TABLE public.equipment_operator_checkin_settings
  DROP CONSTRAINT IF EXISTS equipment_operator_checkin_settings_template_id_fkey;

ALTER TABLE public.equipment_operator_checkin_settings
  DROP CONSTRAINT IF EXISTS equipment_operator_checkin_settings_equipment_id_fkey;

ALTER TABLE public.equipment_operator_checkin_settings
  DROP CONSTRAINT IF EXISTS equipment_operator_checkin_settings_equipment_org_fkey;

ALTER TABLE public.equipment_operator_checkin_settings
  ADD CONSTRAINT equipment_operator_checkin_settings_template_org_fkey
  FOREIGN KEY (template_id, organization_id)
  REFERENCES public.operator_checklist_templates (id, organization_id)
  ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE public.equipment_operator_checkin_settings
  ADD CONSTRAINT equipment_operator_checkin_settings_equipment_org_fkey
  FOREIGN KEY (equipment_id, organization_id)
  REFERENCES public.equipment (id, organization_id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.equipment_operator_checkin_settings
  VALIDATE CONSTRAINT equipment_operator_checkin_settings_template_org_fkey;

ALTER TABLE public.equipment_operator_checkin_settings
  VALIDATE CONSTRAINT equipment_operator_checkin_settings_equipment_org_fkey;

DROP POLICY IF EXISTS equipment_operator_checkin_settings_insert_admin
  ON public.equipment_operator_checkin_settings;

CREATE POLICY equipment_operator_checkin_settings_insert_admin
  ON public.equipment_operator_checkin_settings
  FOR INSERT WITH CHECK (
    public.is_org_admin((SELECT auth.uid()), organization_id)
    AND EXISTS (
      SELECT 1 FROM public.equipment e
      WHERE e.id = equipment_operator_checkin_settings.equipment_id
        AND e.organization_id = equipment_operator_checkin_settings.organization_id
    )
    AND EXISTS (
      SELECT 1 FROM public.operator_checklist_templates tpl
      WHERE tpl.id = equipment_operator_checkin_settings.template_id
        AND tpl.organization_id = equipment_operator_checkin_settings.organization_id
    )
  );

DROP POLICY IF EXISTS equipment_operator_checkin_settings_update_admin
  ON public.equipment_operator_checkin_settings;

CREATE POLICY equipment_operator_checkin_settings_update_admin
  ON public.equipment_operator_checkin_settings
  FOR UPDATE
  USING (
    public.is_org_admin((SELECT auth.uid()), organization_id)
  )
  WITH CHECK (
    public.is_org_admin((SELECT auth.uid()), organization_id)
    AND EXISTS (
      SELECT 1 FROM public.equipment e
      WHERE e.id = equipment_operator_checkin_settings.equipment_id
        AND e.organization_id = equipment_operator_checkin_settings.organization_id
    )
    AND EXISTS (
      SELECT 1 FROM public.operator_checklist_templates tpl
      WHERE tpl.id = equipment_operator_checkin_settings.template_id
        AND tpl.organization_id = equipment_operator_checkin_settings.organization_id
    )
  );

CREATE OR REPLACE FUNCTION public.validate_operator_checkin_settings_org_refs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.equipment e
    WHERE e.id = NEW.equipment_id
      AND e.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'equipment assignment organization mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.operator_checklist_templates tpl
    WHERE tpl.id = NEW.template_id
      AND tpl.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'template assignment organization mismatch';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_operator_checkin_settings_org_refs
  ON public.equipment_operator_checkin_settings;

CREATE TRIGGER trg_validate_operator_checkin_settings_org_refs
  BEFORE INSERT OR UPDATE OF equipment_id, template_id, organization_id
  ON public.equipment_operator_checkin_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_operator_checkin_settings_org_refs();

-- One-time repair for existing inconsistent rows (org-scoped).
UPDATE public.operator_checklist_templates AS t
SET is_active = true,
    updated_at = now()
WHERE t.is_active = false
  AND EXISTS (
    SELECT 1
    FROM public.equipment_operator_checkin_settings AS s
    WHERE s.template_id = t.id
      AND s.organization_id = t.organization_id
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
      AND organization_id = NEW.organization_id
      AND is_active = false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_operator_template_active_for_enabled_assignment
  ON public.equipment_operator_checkin_settings;

CREATE TRIGGER trg_ensure_operator_template_active_for_enabled_assignment
  BEFORE INSERT OR UPDATE OF enabled, template_id, organization_id
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
        AND s.organization_id = NEW.organization_id
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
GRANT EXECUTE ON FUNCTION public.delete_operator_checklist_template(uuid) TO authenticated;

-- rpc-anon-grant-allowed: resolve_operator_checkin_by_token
CREATE OR REPLACE FUNCTION public.resolve_operator_checkin_by_token(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
BEGIN
  IF p_token_hash IS NULL OR length(trim(p_token_hash)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT
    s.id,
    s.organization_id,
    s.equipment_id,
    s.template_id,
    s.enabled,
    jsonb_build_object(
      'id', e.id,
      'name', e.name,
      'serial_number', e.serial_number,
      'manufacturer', e.manufacturer,
      'model', e.model,
      'status', e.status,
      'location', e.location,
      'working_hours', e.working_hours,
      'custom_attributes', e.custom_attributes,
      'organization_id', e.organization_id,
      'team', CASE WHEN t.id IS NULL THEN NULL ELSE jsonb_build_object('id', t.id, 'name', t.name) END,
      'organizations', jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'scan_location_collection_enabled', o.scan_location_collection_enabled
      )
    ) AS equipment,
    jsonb_build_object(
      'id', tpl.id,
      'name', tpl.name,
      'description', tpl.description,
      'template_data', tpl.template_data,
      'is_active', tpl.is_active
    ) AS template
  INTO v_row
  FROM public.equipment_operator_checkin_settings s
  JOIN public.equipment e
    ON e.id = s.equipment_id
   AND e.organization_id = s.organization_id
  JOIN public.organizations o ON o.id = s.organization_id
  LEFT JOIN public.teams t ON t.id = e.team_id
  JOIN public.operator_checklist_templates tpl
    ON tpl.id = s.template_id
   AND tpl.organization_id = s.organization_id
  WHERE s.public_token_hash = p_token_hash
    AND s.enabled = true
    AND tpl.is_active = true
  LIMIT 1;

  IF v_row IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'organization_id', v_row.organization_id,
    'equipment_id', v_row.equipment_id,
    'template_id', v_row.template_id,
    'enabled', v_row.enabled,
    'equipment', v_row.equipment,
    'template', v_row.template
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_operator_checkin_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_operator_checkin_by_token(text) TO anon;

CREATE OR REPLACE FUNCTION public.submit_operator_checkin_public(
  p_token_hash text,
  p_operator_field_values jsonb,
  p_client_field_values jsonb,
  p_equipment_field_values jsonb,
  p_checklist_answers jsonb,
  p_template_snapshot jsonb,
  p_is_complete boolean,
  p_required_item_count integer,
  p_answered_required_count integer,
  p_request_fingerprint text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings record;
  v_submission_id uuid;
  v_submitted_at timestamptz := now();
  v_recent_count integer;
BEGIN
  SELECT s.id, s.organization_id, s.equipment_id, s.template_id, s.enabled, tpl.is_active
  INTO v_settings
  FROM public.equipment_operator_checkin_settings s
  JOIN public.operator_checklist_templates tpl
    ON tpl.id = s.template_id
   AND tpl.organization_id = s.organization_id
  WHERE s.public_token_hash = p_token_hash
  LIMIT 1;

  IF v_settings IS NULL OR NOT v_settings.enabled OR NOT v_settings.is_active THEN
    RAISE EXCEPTION 'Check-in is not available';
  END IF;

  SELECT count(*)::integer INTO v_recent_count
  FROM public.operator_checkin_submissions sub
  WHERE sub.settings_id = v_settings.id
    AND sub.organization_id = v_settings.organization_id
    AND sub.submitted_at >= (now() - interval '1 hour');

  IF v_recent_count >= 20 THEN
    RAISE EXCEPTION 'Too many check-ins. Please try again later.';
  END IF;

  INSERT INTO public.operator_checkin_submissions (
    organization_id,
    equipment_id,
    template_id,
    settings_id,
    submitted_at,
    template_snapshot,
    operator_field_values,
    client_field_values,
    equipment_field_values,
    checklist_answers,
    is_complete,
    required_item_count,
    answered_required_count,
    request_fingerprint
  ) VALUES (
    v_settings.organization_id,
    v_settings.equipment_id,
    v_settings.template_id,
    v_settings.id,
    v_submitted_at,
    COALESCE(p_template_snapshot, '{}'::jsonb),
    COALESCE(p_operator_field_values, '[]'::jsonb),
    COALESCE(p_client_field_values, '[]'::jsonb),
    COALESCE(p_equipment_field_values, '[]'::jsonb),
    COALESCE(p_checklist_answers, '[]'::jsonb),
    COALESCE(p_is_complete, false),
    COALESCE(p_required_item_count, 0),
    COALESCE(p_answered_required_count, 0),
    left(COALESCE(p_request_fingerprint, ''), 128)
  )
  RETURNING id INTO v_submission_id;

  RETURN jsonb_build_object(
    'id', v_submission_id,
    'submitted_at', v_submitted_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_operator_checkin_public(
  text, jsonb, jsonb, jsonb, jsonb, jsonb, boolean, integer, integer, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_operator_checkin_public(
  text, jsonb, jsonb, jsonb, jsonb, jsonb, boolean, integer, integer, text
) TO service_role;

COMMIT;
