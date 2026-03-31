-- Migration: Retention enforcement — anonymization, cleanup, and scheduling
--
-- 1. Audit log anonymization function for DSR deletion requests
-- 2. Expired invitation cleanup
-- 3. Stale Google Workspace directory user cleanup
-- 4. Expired Google Workspace OAuth session cleanup
-- 5. User departure queue cleanup (completed/failed entries)
-- 6. Schedule existing cleanup functions via pg_cron

BEGIN;

-- ============================================================================
-- 1. Audit log anonymization for consumer deletion requests
-- ============================================================================

CREATE OR REPLACE FUNCTION public.anonymize_audit_log_for_user(p_email text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.audit_log
  SET actor_name  = 'Deleted User',
      actor_email = '[redacted]',
      changes     = public.anonymize_audit_changes(changes, p_email)
  WHERE actor_email = p_email;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION public.anonymize_audit_log_for_user(text) IS
  'Replaces actor_name, actor_email, and scrubs the email from changes JSONB '
  'for all audit_log rows matching the given email. Used for CCPA deletion requests.';

CREATE OR REPLACE FUNCTION public.anonymize_audit_changes(
  p_changes jsonb,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN regexp_replace(
    p_changes::text,
    regexp_replace(p_email, '([.\+\*\?\[\]\(\)\{\}\|\\^$])', '\\\1', 'g'),
    '[redacted]',
    'gi'
  )::jsonb;
END;
$$;

COMMENT ON FUNCTION public.anonymize_audit_changes(jsonb, text) IS
  'Replaces occurrences of an email address inside a JSONB changes payload with [redacted].';

REVOKE EXECUTE ON FUNCTION public.anonymize_audit_log_for_user(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.anonymize_audit_log_for_user(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.anonymize_audit_log_for_user(text) FROM authenticated;

-- ============================================================================
-- 2. Cleanup expired/declined invitations older than 30 days
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rows integer;
BEGIN
  DELETE FROM public.organization_invitations
  WHERE status IN ('expired', 'declined')
    AND COALESCE(expired_at, created_at) < (now() - interval '30 days');

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_invitations() IS
  'Deletes expired or declined invitation records older than 30 days. '
  'Minimizes retention of invitee email addresses per data minimization principles.';

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_invitations() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_invitations() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_invitations() FROM authenticated;

-- ============================================================================
-- 3. Cleanup stale Google Workspace directory users not refreshed in 30 days
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_stale_gws_directory_users()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rows integer;
BEGIN
  DELETE FROM public.google_workspace_directory_users
  WHERE last_synced_at < (now() - interval '30 days');

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION public.cleanup_stale_gws_directory_users() IS
  'Removes Google Workspace directory user records that have not been refreshed '
  'in the last 30 days. Stale entries likely represent departed employees.';

REVOKE EXECUTE ON FUNCTION public.cleanup_stale_gws_directory_users() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_gws_directory_users() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_gws_directory_users() FROM authenticated;

-- ============================================================================
-- 4. Cleanup expired Google Workspace OAuth sessions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_gws_oauth_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rows integer;
BEGIN
  DELETE FROM public.google_workspace_oauth_sessions
  WHERE expires_at < (now() - interval '1 day');

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_gws_oauth_sessions() IS
  'Deletes expired Google Workspace OAuth CSRF sessions older than 1 day.';

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_gws_oauth_sessions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_gws_oauth_sessions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_gws_oauth_sessions() FROM authenticated;

-- ============================================================================
-- 5. Cleanup completed/failed departure queue entries older than 90 days
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_departure_queue()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rows integer;
BEGIN
  DELETE FROM public.user_departure_queue
  WHERE status IN ('completed', 'failed')
    AND created_at < (now() - interval '90 days');

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_departure_queue() IS
  'Removes completed or failed user departure queue entries older than 90 days.';

REVOKE EXECUTE ON FUNCTION public.cleanup_old_departure_queue() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_departure_queue() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_departure_queue() FROM authenticated;

-- ============================================================================
-- 6. Schedule retention jobs via pg_cron (if available)
-- ============================================================================

DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Notification cleanup (30 days) — daily at 03:00 UTC
    BEGIN
      PERFORM cron.unschedule('cleanup-old-notifications');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule(
      'cleanup-old-notifications',
      '0 3 * * *',
      'SELECT public.cleanup_old_notifications()'
    );

    -- Export log cleanup (90 days) — daily at 03:10 UTC
    BEGIN
      PERFORM cron.unschedule('cleanup-old-export-logs');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule(
      'cleanup-old-export-logs',
      '10 3 * * *',
      'SELECT public.cleanup_old_export_logs()'
    );

    -- Expired invitation cleanup — daily at 03:20 UTC
    BEGIN
      PERFORM cron.unschedule('cleanup-expired-invitations');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule(
      'cleanup-expired-invitations',
      '20 3 * * *',
      'SELECT public.cleanup_expired_invitations()'
    );

    -- Stale GWS directory user cleanup — daily at 03:30 UTC
    BEGIN
      PERFORM cron.unschedule('cleanup-stale-gws-directory-users');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule(
      'cleanup-stale-gws-directory-users',
      '30 3 * * *',
      'SELECT public.cleanup_stale_gws_directory_users()'
    );

    -- Expired GWS OAuth session cleanup — daily at 03:40 UTC
    BEGIN
      PERFORM cron.unschedule('cleanup-expired-gws-oauth-sessions');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule(
      'cleanup-expired-gws-oauth-sessions',
      '40 3 * * *',
      'SELECT public.cleanup_expired_gws_oauth_sessions()'
    );

    -- Departure queue cleanup (90 days) — daily at 03:50 UTC
    BEGIN
      PERFORM cron.unschedule('cleanup-old-departure-queue');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule(
      'cleanup-old-departure-queue',
      '50 3 * * *',
      'SELECT public.cleanup_old_departure_queue()'
    );

    RAISE NOTICE 'All retention cleanup jobs scheduled via pg_cron.';
  ELSE
    RAISE NOTICE 'pg_cron not available. Retention cleanup must be triggered externally.';
  END IF;
END $cron$;

COMMIT;
