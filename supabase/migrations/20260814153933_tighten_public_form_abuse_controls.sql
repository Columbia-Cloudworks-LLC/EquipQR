-- Tighten public Quick Form and operator check-in abuse controls (RT-02 / RT-03).
-- Keep submit RPCs service_role-only (edge functions). No unique index on existing
-- same-day duplicates — serialize with pg_advisory_xact_lock then SELECT.

CREATE OR REPLACE FUNCTION public.submit_quick_form_public(
  p_token_hash text,
  p_field_values jsonb,
  p_client_context jsonb,
  p_form_snapshot jsonb,
  p_request_fingerprint text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form record;
  v_submission_id uuid;
  v_submitted_at timestamptz := now();
  v_recent_count integer;
  v_last_submitted_at timestamptz;
  v_fingerprint text := left(COALESCE(p_request_fingerprint, ''), 128);
BEGIN
  SELECT f.id, f.organization_id, f.is_active
  INTO v_form
  FROM public.quick_forms f
  WHERE f.public_token_hash = p_token_hash
  LIMIT 1;

  IF v_form IS NULL OR NOT v_form.is_active THEN
    RAISE EXCEPTION 'Form is not available';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('quick_form:' || v_form.id::text));

  SELECT max(sub.submitted_at) INTO v_last_submitted_at
  FROM public.quick_form_submissions sub
  WHERE sub.quick_form_id = v_form.id;

  IF v_last_submitted_at IS NOT NULL
     AND v_last_submitted_at > (now() - interval '10 minutes') THEN
    RAISE EXCEPTION 'Please wait before submitting again.';
  END IF;

  SELECT count(*)::integer INTO v_recent_count
  FROM public.quick_form_submissions sub
  WHERE sub.quick_form_id = v_form.id
    AND sub.submitted_at >= (now() - interval '1 hour');

  IF v_recent_count >= 5 THEN
    RAISE EXCEPTION 'Too many submissions. Please try again later.';
  END IF;

  IF length(v_fingerprint) > 0 THEN
    SELECT count(*)::integer INTO v_recent_count
    FROM public.quick_form_submissions sub
    WHERE sub.quick_form_id = v_form.id
      AND sub.request_fingerprint = v_fingerprint
      AND sub.submitted_at >= (now() - interval '1 hour');

    IF v_recent_count >= 3 THEN
      RAISE EXCEPTION 'Too many submissions. Please try again later.';
    END IF;
  END IF;

  INSERT INTO public.quick_form_submissions (
    organization_id,
    quick_form_id,
    submitted_at,
    form_snapshot,
    field_values,
    client_context,
    request_fingerprint
  ) VALUES (
    v_form.organization_id,
    v_form.id,
    v_submitted_at,
    COALESCE(p_form_snapshot, '{}'::jsonb),
    COALESCE(p_field_values, '[]'::jsonb),
    COALESCE(p_client_context, '{}'::jsonb),
    v_fingerprint
  )
  RETURNING id INTO v_submission_id;

  RETURN jsonb_build_object(
    'id', v_submission_id,
    'submitted_at', v_submitted_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quick_form_public(text, jsonb, jsonb, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_quick_form_public(text, jsonb, jsonb, jsonb, text) FROM anon;
REVOKE ALL ON FUNCTION public.submit_quick_form_public(text, jsonb, jsonb, jsonb, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quick_form_public(text, jsonb, jsonb, jsonb, text) TO service_role;

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
  v_day_start timestamptz := date_trunc('day', timezone('utc', now())) AT TIME ZONE 'utc';
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

  PERFORM pg_advisory_xact_lock(hashtext('operator_checkin:' || v_settings.id::text));

  IF EXISTS (
    SELECT 1
    FROM public.operator_checkin_submissions sub
    WHERE sub.settings_id = v_settings.id
      AND sub.organization_id = v_settings.organization_id
      AND sub.submitted_at >= v_day_start
      AND sub.submitted_at < v_day_start + interval '1 day'
  ) THEN
    RAISE EXCEPTION 'Check-in already submitted today.';
  END IF;

  SELECT count(*)::integer INTO v_recent_count
  FROM public.operator_checkin_submissions sub
  WHERE sub.settings_id = v_settings.id
    AND sub.organization_id = v_settings.organization_id
    AND sub.submitted_at >= (now() - interval '1 hour');

  IF v_recent_count >= 8 THEN
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
REVOKE ALL ON FUNCTION public.submit_operator_checkin_public(
  text, jsonb, jsonb, jsonb, jsonb, jsonb, boolean, integer, integer, text
) FROM anon;
REVOKE ALL ON FUNCTION public.submit_operator_checkin_public(
  text, jsonb, jsonb, jsonb, jsonb, jsonb, boolean, integer, integer, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_operator_checkin_public(
  text, jsonb, jsonb, jsonb, jsonb, jsonb, boolean, integer, integer, text
) TO service_role;
