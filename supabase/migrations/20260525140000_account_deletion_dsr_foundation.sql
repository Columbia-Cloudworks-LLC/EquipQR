-- Supersede fulfill_dsr_deletion: use export_request_log, delegate to prepare_account_deletion.

BEGIN;

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
  v_prep jsonb;
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

  -- Step 1: Anonymize audit log entries (email redaction)
  SELECT public.anonymize_audit_log_for_user(v_dsr.requester_email) INTO v_rows;
  v_step_count := v_step_count + 1;
  v_results := v_results || jsonb_build_object(
    'step', v_step_count, 'domain', 'audit_log', 'action', 'anonymized', 'rows_affected', v_rows
  );
  INSERT INTO public.dsr_request_events (
    dsr_request_id, event_type, actor_id, actor_email, summary, details
  ) VALUES (
    p_dsr_request_id, 'fulfillment_step_completed', p_admin_user_id, v_admin_email,
    'Audit log entries anonymized',
    jsonb_build_object('domain', 'audit_log', 'rows_anonymized', v_rows)
  );

  -- Step 2: SQL prep via prepare_account_deletion when user_id is known
  IF v_dsr.user_id IS NOT NULL THEN
    v_prep := public.prepare_account_deletion(v_dsr.user_id, p_dsr_request_id, p_admin_user_id);
    v_step_count := v_step_count + 1;
    v_results := v_results || jsonb_build_object(
      'step', v_step_count,
      'domain', 'account_deletion_prep',
      'action', 'prepared',
      'details', v_prep
    );
  ELSE
    -- Email-only DSR without linked auth user
    DELETE FROM public.organization_invitations WHERE email = v_dsr.requester_email;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_step_count := v_step_count + 1;
    v_results := v_results || jsonb_build_object(
      'step', v_step_count, 'domain', 'organization_invitations', 'action', 'deleted', 'rows_affected', v_rows
    );
    INSERT INTO public.dsr_request_events (
      dsr_request_id, event_type, actor_id, actor_email, summary, details
    ) VALUES (
      p_dsr_request_id, 'fulfillment_step_completed', p_admin_user_id, v_admin_email,
      'Invitation records deleted',
      jsonb_build_object('domain', 'organization_invitations', 'rows_deleted', v_rows)
    );
  END IF;

  -- Step 3: export_request_log cleanup by user_id or org scope when unlinked
  IF v_dsr.user_id IS NOT NULL THEN
    DELETE FROM public.export_request_log WHERE user_id = v_dsr.user_id;
  ELSIF v_dsr.organization_id IS NOT NULL THEN
    DELETE FROM public.export_request_log
    WHERE organization_id = v_dsr.organization_id
      AND user_id IS NULL;
  END IF;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_step_count := v_step_count + 1;
  v_results := v_results || jsonb_build_object(
    'step', v_step_count, 'domain', 'export_request_log', 'action', 'deleted', 'rows_affected', v_rows
  );
  INSERT INTO public.dsr_request_events (
    dsr_request_id, event_type, actor_id, actor_email, summary, details
  ) VALUES (
    p_dsr_request_id, 'fulfillment_step_completed', p_admin_user_id, v_admin_email,
    'Export request log records deleted',
    jsonb_build_object('domain', 'export_request_log', 'rows_deleted', v_rows)
  );

  INSERT INTO public.dsr_request_events (
    dsr_request_id, event_type, actor_id, actor_email, summary, details
  ) VALUES (
    p_dsr_request_id, 'fulfillment_step_completed', p_admin_user_id, v_admin_email,
    'All automated SQL fulfillment steps completed',
    jsonb_build_object(
      'total_steps', v_step_count,
      'results', v_results,
      'note', 'Storage cleanup and Auth user deletion require delete-account edge function or manual operator steps.'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'steps_executed', v_step_count,
    'results', v_results,
    'requires_storage_and_auth_completion', v_dsr.user_id IS NOT NULL
  );
END;
$$;

COMMENT ON FUNCTION public.fulfill_dsr_deletion(uuid, uuid) IS
  'Executes deletion/anonymization for verified DSR deletion requests. Uses '
  'prepare_account_deletion for linked auth users and export_request_log (not export_logs). '
  'Storage API cleanup and Auth deletion are completed outside this RPC.';

REVOKE EXECUTE ON FUNCTION public.fulfill_dsr_deletion(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fulfill_dsr_deletion(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fulfill_dsr_deletion(uuid, uuid) FROM authenticated;

-- ============================================================================
-- Storage metadata helpers for edge-function orchestration
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_account_deletion_storage_metadata(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_delete_paths jsonb := '[]'::jsonb;
  v_reassigned integer := 0;
BEGIN
  SELECT coalesce(jsonb_agg(jsonb_build_object('bucket', bucket_id, 'path', name)), '[]'::jsonb)
  INTO v_delete_paths
  FROM storage.objects
  WHERE owner_id = p_user_id
    AND bucket_id = 'user-avatars';

  UPDATE storage.objects
  SET owner = NULL,
      owner_id = NULL
  WHERE owner_id = p_user_id
    AND bucket_id IN ('work-order-images', 'equipment-note-images', 'inventory-item-images');

  GET DIAGNOSTICS v_reassigned = ROW_COUNT;

  RETURN jsonb_build_object(
    'delete_paths', v_delete_paths,
    'reassigned_object_count', v_reassigned
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_account_deletion_storage_metadata(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_account_deletion_storage_metadata(uuid) TO service_role;

COMMIT;
