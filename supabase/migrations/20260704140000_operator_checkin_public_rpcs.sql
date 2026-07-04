-- Public operator check-in RPCs (#1091) — token-gated access without service-role edge calls.

BEGIN;

-- rpc-authenticated-grant-allowed: resolve_operator_checkin_by_token
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
  JOIN public.equipment e ON e.id = s.equipment_id
  JOIN public.organizations o ON o.id = s.organization_id
  LEFT JOIN public.teams t ON t.id = e.team_id
  JOIN public.operator_checklist_templates tpl ON tpl.id = s.template_id
  WHERE s.public_token_hash = p_token_hash
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
GRANT EXECUTE ON FUNCTION public.resolve_operator_checkin_by_token(text) TO anon, authenticated;

-- rpc-authenticated-grant-allowed: submit_operator_checkin_public
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
  JOIN public.operator_checklist_templates tpl ON tpl.id = s.template_id
  WHERE s.public_token_hash = p_token_hash
  LIMIT 1;

  IF v_settings IS NULL OR NOT v_settings.enabled OR NOT v_settings.is_active THEN
    RAISE EXCEPTION 'Check-in is not available';
  END IF;

  SELECT count(*)::integer INTO v_recent_count
  FROM public.operator_checkin_submissions sub
  WHERE sub.settings_id = v_settings.id
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
    p_template_snapshot,
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
) TO anon, authenticated;

COMMIT;
