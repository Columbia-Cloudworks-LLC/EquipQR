-- Fix enqueue_export_job: pgmq_public.send returns SETOF bigint, not msg_id column.
--
-- rpc-authenticated-grant-allowed: enqueue_export_job
-- Down: restore enqueue_export_job body from 20260709142313_harden_async_export_job_scope.sql

CREATE OR REPLACE FUNCTION public.enqueue_export_job(
  p_organization_id uuid,
  p_report_type text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_log_id uuid;
  v_msg_id bigint;
  v_allowed boolean;
  v_is_admin boolean;
  v_team_ids uuid[];
  v_client_team_ids uuid[];
  v_sanitized_payload jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_org_member(v_user_id, p_organization_id) THEN
    RAISE EXCEPTION 'Access denied: not an active organization member'
      USING ERRCODE = '42501';
  END IF;

  IF p_report_type NOT IN ('equipment', 'work-orders') THEN
    RAISE EXCEPTION 'Unsupported async report type: %', p_report_type
      USING ERRCODE = '22023';
  END IF;

  v_is_admin := public.is_org_admin(v_user_id, p_organization_id);

  IF p_report_type = 'equipment' AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied: organization admin required for equipment export'
      USING ERRCODE = '42501';
  END IF;

  v_sanitized_payload := COALESCE(p_payload, '{}'::jsonb);

  IF p_report_type = 'work-orders' THEN
    IF v_is_admin THEN
      IF jsonb_typeof(v_sanitized_payload -> 'accessibleTeamIds') = 'array' THEN
        SELECT COALESCE(array_agg(value::uuid), ARRAY[]::uuid[])
        INTO v_client_team_ids
        FROM jsonb_array_elements_text(v_sanitized_payload -> 'accessibleTeamIds') AS value
        WHERE value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

        v_sanitized_payload := jsonb_set(
          v_sanitized_payload,
          '{accessibleTeamIds}',
          to_jsonb(v_client_team_ids),
          true
        );
      ELSE
        v_sanitized_payload := v_sanitized_payload - 'accessibleTeamIds';
      END IF;
    ELSE
      SELECT COALESCE(array_agg(tm.team_id), ARRAY[]::uuid[])
      INTO v_team_ids
      FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.user_id = v_user_id
        AND t.organization_id = p_organization_id
        AND tm.role IN (
          'requestor'::public.team_member_role,
          'viewer'::public.team_member_role
        );

      IF jsonb_typeof(v_sanitized_payload -> 'accessibleTeamIds') = 'array' THEN
        SELECT COALESCE(array_agg(value::uuid), ARRAY[]::uuid[])
        INTO v_client_team_ids
        FROM jsonb_array_elements_text(v_sanitized_payload -> 'accessibleTeamIds') AS value
        WHERE value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

        v_team_ids := ARRAY(
          SELECT unnest(v_team_ids)
          INTERSECT
          SELECT unnest(v_client_team_ids)
        );
      END IF;

      IF cardinality(v_team_ids) = 0 THEN
        RETURN jsonb_build_object(
          'success', false,
          'code', 'forbidden',
          'error', 'Access denied: no team-scoped work order export permission'
        );
      END IF;

      v_sanitized_payload := jsonb_set(
        v_sanitized_payload,
        '{accessibleTeamIds}',
        to_jsonb(v_team_ids),
        true
      );
    END IF;
  END IF;

  SELECT public.check_export_rate_limit(v_user_id, p_organization_id) INTO v_allowed;
  IF NOT COALESCE(v_allowed, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'rate_limited',
      'error', 'Rate limit exceeded. Please wait before requesting another export.'
    );
  END IF;

  INSERT INTO public.export_request_log (
    user_id,
    organization_id,
    report_type,
    row_count,
    status,
    job_mode,
    delivery,
    request_payload
  ) VALUES (
    v_user_id,
    p_organization_id,
    p_report_type,
    0,
    'pending',
    'async',
    'storage',
    v_sanitized_payload
  )
  RETURNING id INTO v_log_id;

  SELECT send INTO v_msg_id
  FROM pgmq_public.send(
    'exports',
    jsonb_build_object(
      'export_log_id', v_log_id,
      'organization_id', p_organization_id,
      'user_id', v_user_id,
      'report_type', p_report_type
    ),
    0
  ) AS send
  LIMIT 1;

  UPDATE public.export_request_log
  SET pgmq_msg_id = v_msg_id
  WHERE id = v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'jobId', v_log_id,
    'status', 'pending',
    'pgmqMsgId', v_msg_id
  );
END;
$$;

COMMENT ON FUNCTION public.enqueue_export_job IS
  'Creates an async export_request_log row and enqueues a pgmq exports message; sanitizes work-order team scope from DB memberships (#1193/#1205).';
