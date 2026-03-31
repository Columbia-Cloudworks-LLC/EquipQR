-- Migration: DSR fulfillment engine
--
-- Provides a SECURITY DEFINER function that executes deletion/anonymization
-- across all product data domains for a verified DSR, recording per-step
-- execution receipts into the immutable dsr_request_events ledger.

BEGIN;

-- ============================================================================
-- 1. Core fulfillment function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fulfill_dsr_deletion(
  p_dsr_request_id uuid,
  p_admin_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_dsr record;
  v_admin_email text;
  v_step_count integer := 0;
  v_rows integer;
  v_results jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO v_dsr
  FROM public.dsr_requests
  WHERE id = p_dsr_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DSR request not found: %', p_dsr_request_id;
  END IF;

  IF v_dsr.status != 'processing' THEN
    RAISE EXCEPTION 'DSR request must be in processing state, current: %', v_dsr.status;
  END IF;

  IF v_dsr.request_type != 'deletion' THEN
    RAISE EXCEPTION 'Fulfillment engine only handles deletion requests, got: %', v_dsr.request_type;
  END IF;

  SELECT email INTO v_admin_email FROM auth.users WHERE id = p_admin_user_id;

  -- Step 1: Anonymize audit log entries
  SELECT public.anonymize_audit_log_for_user(v_dsr.requester_email) INTO v_rows;
  v_step_count := v_step_count + 1;
  v_results := v_results || jsonb_build_object(
    'step', v_step_count, 'domain', 'audit_log', 'action', 'anonymized',
    'rows_affected', v_rows
  );
  INSERT INTO public.dsr_request_events (
    dsr_request_id, event_type, actor_id, actor_email, summary, details
  ) VALUES (
    p_dsr_request_id, 'fulfillment_step_completed', p_admin_user_id, v_admin_email,
    'Audit log entries anonymized',
    jsonb_build_object('domain', 'audit_log', 'rows_anonymized', v_rows)
  );

  -- Step 2: Remove scan records if user_id is linked
  IF v_dsr.user_id IS NOT NULL THEN
    DELETE FROM public.scans WHERE scanned_by = v_dsr.user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
  ELSE
    v_rows := 0;
  END IF;
  v_step_count := v_step_count + 1;
  v_results := v_results || jsonb_build_object(
    'step', v_step_count, 'domain', 'scans', 'action', 'deleted',
    'rows_affected', v_rows
  );
  INSERT INTO public.dsr_request_events (
    dsr_request_id, event_type, actor_id, actor_email, summary, details
  ) VALUES (
    p_dsr_request_id, 'fulfillment_step_completed', p_admin_user_id, v_admin_email,
    'Scan records deleted',
    jsonb_build_object('domain', 'scans', 'rows_deleted', v_rows)
  );

  -- Step 3: Clear export logs for the email
  DELETE FROM public.export_logs WHERE user_email = v_dsr.requester_email;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_step_count := v_step_count + 1;
  v_results := v_results || jsonb_build_object(
    'step', v_step_count, 'domain', 'export_logs', 'action', 'deleted',
    'rows_affected', v_rows
  );
  INSERT INTO public.dsr_request_events (
    dsr_request_id, event_type, actor_id, actor_email, summary, details
  ) VALUES (
    p_dsr_request_id, 'fulfillment_step_completed', p_admin_user_id, v_admin_email,
    'Export log records deleted',
    jsonb_build_object('domain', 'export_logs', 'rows_deleted', v_rows)
  );

  -- Step 4: Remove notifications for the user
  IF v_dsr.user_id IS NOT NULL THEN
    DELETE FROM public.notifications WHERE user_id = v_dsr.user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
  ELSE
    v_rows := 0;
  END IF;
  v_step_count := v_step_count + 1;
  v_results := v_results || jsonb_build_object(
    'step', v_step_count, 'domain', 'notifications', 'action', 'deleted',
    'rows_affected', v_rows
  );
  INSERT INTO public.dsr_request_events (
    dsr_request_id, event_type, actor_id, actor_email, summary, details
  ) VALUES (
    p_dsr_request_id, 'fulfillment_step_completed', p_admin_user_id, v_admin_email,
    'Notification records deleted',
    jsonb_build_object('domain', 'notifications', 'rows_deleted', v_rows)
  );

  -- Step 5: Remove push subscriptions for the user
  IF v_dsr.user_id IS NOT NULL THEN
    DELETE FROM public.push_subscriptions WHERE user_id = v_dsr.user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
  ELSE
    v_rows := 0;
  END IF;
  v_step_count := v_step_count + 1;
  v_results := v_results || jsonb_build_object(
    'step', v_step_count, 'domain', 'push_subscriptions', 'action', 'deleted',
    'rows_affected', v_rows
  );
  INSERT INTO public.dsr_request_events (
    dsr_request_id, event_type, actor_id, actor_email, summary, details
  ) VALUES (
    p_dsr_request_id, 'fulfillment_step_completed', p_admin_user_id, v_admin_email,
    'Push subscription records deleted',
    jsonb_build_object('domain', 'push_subscriptions', 'rows_deleted', v_rows)
  );

  -- Step 6: Clear invitations sent to/from the email
  DELETE FROM public.organization_invitations WHERE email = v_dsr.requester_email;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_step_count := v_step_count + 1;
  v_results := v_results || jsonb_build_object(
    'step', v_step_count, 'domain', 'organization_invitations', 'action', 'deleted',
    'rows_affected', v_rows
  );
  INSERT INTO public.dsr_request_events (
    dsr_request_id, event_type, actor_id, actor_email, summary, details
  ) VALUES (
    p_dsr_request_id, 'fulfillment_step_completed', p_admin_user_id, v_admin_email,
    'Invitation records deleted',
    jsonb_build_object('domain', 'organization_invitations', 'rows_deleted', v_rows)
  );

  -- Step 7: Anonymize profile if user_id is linked
  IF v_dsr.user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET name = 'Deleted User',
        avatar_url = NULL,
        limit_sensitive_pi = true
    WHERE id = v_dsr.user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
  ELSE
    v_rows := 0;
  END IF;
  v_step_count := v_step_count + 1;
  v_results := v_results || jsonb_build_object(
    'step', v_step_count, 'domain', 'profiles', 'action', 'anonymized',
    'rows_affected', v_rows
  );
  INSERT INTO public.dsr_request_events (
    dsr_request_id, event_type, actor_id, actor_email, summary, details
  ) VALUES (
    p_dsr_request_id, 'fulfillment_step_completed', p_admin_user_id, v_admin_email,
    'User profile anonymized',
    jsonb_build_object('domain', 'profiles', 'rows_anonymized', v_rows)
  );

  -- Final: record completion summary
  INSERT INTO public.dsr_request_events (
    dsr_request_id, event_type, actor_id, actor_email, summary, details
  ) VALUES (
    p_dsr_request_id, 'fulfillment_step_completed', p_admin_user_id, v_admin_email,
    'All automated fulfillment steps completed',
    jsonb_build_object('total_steps', v_step_count, 'results', v_results)
  );

  RETURN jsonb_build_object(
    'success', true,
    'steps_executed', v_step_count,
    'results', v_results
  );
END;
$$;

COMMENT ON FUNCTION public.fulfill_dsr_deletion(uuid, uuid) IS
  'Executes deletion/anonymization across product data domains for a verified '
  'DSR deletion request. Records per-step execution receipts in dsr_request_events. '
  'Caller must ensure DSR is in processing state and request_type is deletion.';

REVOKE EXECUTE ON FUNCTION public.fulfill_dsr_deletion(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fulfill_dsr_deletion(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fulfill_dsr_deletion(uuid, uuid) FROM authenticated;

COMMIT;
