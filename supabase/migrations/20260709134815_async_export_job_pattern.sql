-- =============================================================================
-- Migration: Async export job pattern + DB-side CSV row shaping
-- Issue: #1193
-- Date: 2026-07-09
--
-- Introduces:
--   * export_request_log job columns (processing status, result URL, payload)
--   * pgmq `exports` queue drained by queue-worker alongside notifications
--   * private `export-results` storage bucket (short-lived signed downloads)
--   * SECURITY DEFINER RPCs that return pre-shaped export rows (minimal egress)
--   * enqueue_export_job / get_export_job_status for the async lifecycle
--
-- Down (manual): drop new RPCs/policies/bucket/queue columns; restore status CHECK.
-- =============================================================================

-- rpc-authenticated-grant-allowed: export_equipment_csv_rows
-- rpc-authenticated-grant-allowed: export_work_orders_csv_rows
-- rpc-authenticated-grant-allowed: enqueue_export_job
-- rpc-authenticated-grant-allowed: get_export_job_status

BEGIN;

-- Allow in-app "export ready" notifications from process-export-job
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'work_order_request'::text,
    'work_order_accepted'::text,
    'work_order_assigned'::text,
    'work_order_completed'::text,
    'work_order_submitted'::text,
    'work_order_in_progress'::text,
    'work_order_on_hold'::text,
    'work_order_cancelled'::text,
    'general'::text,
    'ownership_transfer_request'::text,
    'ownership_transfer_accepted'::text,
    'ownership_transfer_rejected'::text,
    'ownership_transfer_cancelled'::text,
    'member_removed'::text,
    'workspace_migration'::text,
    'workspace_merge_request'::text,
    'workspace_merge_accepted'::text,
    'workspace_merge_rejected'::text,
    'member_added'::text,
    'member_role_changed'::text,
    'team_member_added'::text,
    'team_member_role_changed'::text,
    'audit_export'::text,
    'export_ready'::text
  ]));

-- ============================================================================
-- PART 1: Extend export_request_log for async jobs
-- ============================================================================

ALTER TABLE public.export_request_log
  DROP CONSTRAINT IF EXISTS export_request_log_status_check;

ALTER TABLE public.export_request_log
  ADD CONSTRAINT export_request_log_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'processing'::text,
    'completed'::text,
    'failed'::text,
    'rate_limited'::text
  ]));

ALTER TABLE public.export_request_log
  ADD COLUMN IF NOT EXISTS job_mode text NOT NULL DEFAULT 'sync'
    CHECK (job_mode = ANY (ARRAY['sync'::text, 'async'::text])),
  ADD COLUMN IF NOT EXISTS delivery text NOT NULL DEFAULT 'download'
    CHECK (delivery = ANY (ARRAY['download'::text, 'storage'::text, 'google_drive'::text])),
  ADD COLUMN IF NOT EXISTS result_url text,
  ADD COLUMN IF NOT EXISTS result_storage_path text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pgmq_msg_id bigint;

COMMENT ON COLUMN public.export_request_log.job_mode IS
  'sync = completed in the HTTP request; async = processed by queue-worker (#1193).';
COMMENT ON COLUMN public.export_request_log.delivery IS
  'Where the finished artifact lives: browser download, Storage signed URL, or Google Drive.';
COMMENT ON COLUMN public.export_request_log.request_payload IS
  'Filters/columns/options needed to re-run the export in the worker without re-reading the HTTP body.';
COMMENT ON COLUMN public.export_request_log.result_storage_path IS
  'Object path in the export-results bucket when delivery = storage.';

CREATE INDEX IF NOT EXISTS idx_export_log_async_pending
  ON public.export_request_log (status, requested_at)
  WHERE job_mode = 'async' AND status IN ('pending', 'processing');

-- Authenticated users may update their own pending/processing rows only via
-- service_role / SECURITY DEFINER RPCs. Keep SELECT policies; allow INSERT for
-- the user-scoped edge path that creates the pending log before enqueue.
DROP POLICY IF EXISTS "Users can insert own export logs" ON public.export_request_log;
CREATE POLICY "Users can insert own export logs"
  ON public.export_request_log
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- PART 2: Private storage bucket for async CSV results
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'export-results',
  'export-results',
  false,
  52428800,
  ARRAY['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Path layout: {organization_id}/{user_id}/{export_log_id}.csv
DROP POLICY IF EXISTS "export_results_select_own" ON storage.objects;
CREATE POLICY "export_results_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'export-results'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "export_results_service_role_all" ON storage.objects;
CREATE POLICY "export_results_service_role_all"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'export-results')
  WITH CHECK (bucket_id = 'export-results');

-- ============================================================================
-- PART 3: pgmq exports queue
-- ============================================================================

SELECT pgmq.create('exports');

COMMENT ON TABLE pgmq.q_exports IS
  'Durable queue for async export jobs (#1193). '
  'Producer: public.enqueue_export_job (or service_role pgmq_public.send). '
  'Consumer: supabase/functions/queue-worker → process-export-job.';

-- ============================================================================
-- PART 4: DB RPCs — shaped export rows (minimal egress)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.export_equipment_csv_rows(
  p_organization_id uuid,
  p_columns text[] DEFAULT ARRAY[
    'name','manufacturer','model','serial_number','status','location','team_name'
  ]::text[],
  p_status text DEFAULT NULL,
  p_team_id uuid DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_limit integer DEFAULT 50000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50000), 1), 50000);
  v_rows jsonb;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_org_member((SELECT auth.uid()), p_organization_id) THEN
    RAISE EXCEPTION 'Access denied: not an active organization member'
      USING ERRCODE = '42501';
  END IF;

  -- Equipment CSV is admin-console only (matches export-report gate).
  IF NOT public.is_org_admin((SELECT auth.uid()), p_organization_id) THEN
    RAISE EXCEPTION 'Access denied: organization admin required for equipment export'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(shaped)::jsonb ORDER BY shaped.name), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      e.id,
      e.name,
      e.manufacturer,
      e.model,
      e.serial_number,
      e.status,
      e.location,
      t.name AS team_name,
      e.installation_date,
      e.last_maintenance,
      e.working_hours,
      e.warranty_expiration,
      e.notes,
      e.created_at,
      e.custom_attributes
    FROM public.equipment e
    LEFT JOIN public.teams t ON t.id = e.team_id
    WHERE e.organization_id = p_organization_id
      AND (p_status IS NULL OR e.status = p_status)
      AND (p_team_id IS NULL OR e.team_id = p_team_id)
      AND (p_location IS NULL OR e.location ILIKE '%' || p_location || '%')
    ORDER BY e.name
    LIMIT v_limit
  ) shaped;

  -- Return only requested columns (+ id for URL building) to cut egress.
  RETURN (
    SELECT COALESCE(jsonb_agg(
      (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(row_obj)
        WHERE key = ANY (p_columns || ARRAY['id']::text[])
      )
    ), '[]'::jsonb)
    FROM jsonb_array_elements(v_rows) AS row_obj
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.export_work_orders_csv_rows(
  p_organization_id uuid,
  p_columns text[] DEFAULT ARRAY[
    'title','status','priority','assignee_name','team_name','equipment_name','created_date'
  ]::text[],
  p_status text DEFAULT NULL,
  p_team_id uuid DEFAULT NULL,
  p_priority text DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_accessible_team_ids uuid[] DEFAULT NULL,
  p_limit integer DEFAULT 50000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50000), 1), 50000);
  v_is_admin boolean;
  v_team_ids uuid[];
  v_rows jsonb;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_org_member((SELECT auth.uid()), p_organization_id) THEN
    RAISE EXCEPTION 'Access denied: not an active organization member'
      USING ERRCODE = '42501';
  END IF;

  v_is_admin := public.is_org_admin((SELECT auth.uid()), p_organization_id);

  IF NOT v_is_admin THEN
    -- Scoped exporters (requestor/viewer) — intersect client team list with
    -- real memberships so callers cannot widen scope.
    SELECT COALESCE(array_agg(tm.team_id), ARRAY[]::uuid[])
    INTO v_team_ids
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.user_id = (SELECT auth.uid())
      AND t.organization_id = p_organization_id
      AND tm.role IN ('requestor'::public.team_member_role, 'viewer'::public.team_member_role);

    IF p_accessible_team_ids IS NOT NULL THEN
      v_team_ids := ARRAY(
        SELECT unnest(v_team_ids)
        INTERSECT
        SELECT unnest(p_accessible_team_ids)
      );
    END IF;

    IF cardinality(v_team_ids) = 0 THEN
      RETURN '[]'::jsonb;
    END IF;
  ELSE
    v_team_ids := p_accessible_team_ids;
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(shaped)::jsonb ORDER BY shaped.created_date DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      wo.id,
      wo.title,
      wo.description,
      wo.status,
      wo.priority,
      wo.assignee_name,
      t.name AS team_name,
      eq.name AS equipment_name,
      wo.created_date,
      wo.due_date,
      wo.completed_date,
      wo.estimated_hours,
      wo.has_pm
    FROM public.work_orders wo
    LEFT JOIN public.teams t ON t.id = wo.team_id
    LEFT JOIN public.equipment eq ON eq.id = wo.equipment_id
    WHERE wo.organization_id = p_organization_id
      AND wo.equipment_id IS NOT NULL
      AND (v_team_ids IS NULL OR wo.team_id = ANY (v_team_ids))
      AND (p_status IS NULL OR wo.status = p_status)
      AND (p_team_id IS NULL OR wo.team_id = p_team_id)
      AND (p_priority IS NULL OR wo.priority = p_priority)
      AND (p_date_from IS NULL OR wo.created_date >= p_date_from)
      AND (p_date_to IS NULL OR wo.created_date <= p_date_to)
    ORDER BY wo.created_date DESC
    LIMIT v_limit
  ) shaped;

  RETURN (
    SELECT COALESCE(jsonb_agg(
      (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(row_obj)
        WHERE key = ANY (p_columns || ARRAY['id']::text[])
      )
    ), '[]'::jsonb)
    FROM jsonb_array_elements(v_rows) AS row_obj
  );
END;
$$;

REVOKE ALL ON FUNCTION public.export_equipment_csv_rows(uuid, text[], text, uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.export_work_orders_csv_rows(uuid, text[], text, uuid, text, timestamptz, timestamptz, uuid[], integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.export_equipment_csv_rows(uuid, text[], text, uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_equipment_csv_rows(uuid, text[], text, uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.export_work_orders_csv_rows(uuid, text[], text, uuid, text, timestamptz, timestamptz, uuid[], integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_work_orders_csv_rows(uuid, text[], text, uuid, text, timestamptz, timestamptz, uuid[], integer) TO service_role;

COMMENT ON FUNCTION public.export_equipment_csv_rows IS
  'Returns pre-shaped equipment export rows as JSONB with only requested columns (#1193).';
COMMENT ON FUNCTION public.export_work_orders_csv_rows IS
  'Returns pre-shaped work-order export rows as JSONB with only requested columns; enforces admin vs team scope (#1193).';

-- ============================================================================
-- PART 5: Enqueue + status RPCs
-- ============================================================================

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

  IF p_report_type = 'equipment'
     AND NOT public.is_org_admin(v_user_id, p_organization_id) THEN
    RAISE EXCEPTION 'Access denied: organization admin required for equipment export'
      USING ERRCODE = '42501';
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
    COALESCE(p_payload, '{}'::jsonb)
  )
  RETURNING id INTO v_log_id;

  SELECT msg_id INTO v_msg_id
  FROM pgmq_public.send(
    'exports',
    jsonb_build_object(
      'export_log_id', v_log_id,
      'organization_id', p_organization_id,
      'user_id', v_user_id,
      'report_type', p_report_type
    ),
    0
  )
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

CREATE OR REPLACE FUNCTION public.get_export_job_status(
  p_job_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_row public.export_request_log%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM public.export_request_log
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'not_found');
  END IF;

  IF v_row.user_id <> v_user_id
     AND NOT public.is_org_admin(v_user_id, v_row.organization_id) THEN
    RAISE EXCEPTION 'Access denied'
      USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'jobId', v_row.id,
    'status', v_row.status,
    'reportType', v_row.report_type,
    'rowCount', v_row.row_count,
    'resultUrl', v_row.result_url,
    'resultStoragePath', v_row.result_storage_path,
    'errorMessage', v_row.error_message,
    'requestedAt', v_row.requested_at,
    'startedAt', v_row.started_at,
    'completedAt', v_row.completed_at,
    'jobMode', v_row.job_mode,
    'delivery', v_row.delivery
  );
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_export_job(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_export_job_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_export_job(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_export_job(uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_export_job_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_export_job_status(uuid) TO service_role;

COMMENT ON FUNCTION public.enqueue_export_job IS
  'Creates an async export_request_log row and enqueues a pgmq exports message (#1193).';
COMMENT ON FUNCTION public.get_export_job_status IS
  'Returns pollable status for an async export job owned by the caller or org admin (#1193).';

-- ============================================================================
-- PART 6: Cleanup helper for expired storage artifacts (metadata only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_export_results(
  p_retention_days integer DEFAULT 7
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.export_request_log
  SET
    result_url = NULL,
    result_storage_path = NULL
  WHERE job_mode = 'async'
    AND delivery = 'storage'
    AND completed_at IS NOT NULL
    AND completed_at < (now() - make_interval(days => GREATEST(p_retention_days, 1)))
    AND result_storage_path IS NOT NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_export_results(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_export_results(integer) TO service_role;

COMMIT;
