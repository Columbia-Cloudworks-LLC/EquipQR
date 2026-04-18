-- =============================================================================
-- Migration: apply_pending_admin_grants_quiet_mismatch
-- Purpose:   Replace the RAISE EXCEPTION self-only guard in
--            public.apply_pending_admin_grants_for_user with a quiet RETURN 0
--            so the client never sees an HTTP 400 when a stale or pre-JWT
--            session race causes a mismatched p_user_id.
--
-- Background:
--   Migration 20260209020000_fix_null_safe_self_guard introduced a guard:
--     IF (select auth.uid()) IS NOT NULL
--        AND p_user_id IS DISTINCT FROM (select auth.uid()) THEN
--       RAISE EXCEPTION 'Unauthorized: ...' USING ERRCODE = '28000';
--     END IF;
--
--   In practice the client (src/contexts/AuthContext.tsx) calls this RPC
--   inside an onAuthStateChange('SIGNED_IN') handler. There is a brief
--   window during which the supabase-js client may dispatch the RPC before
--   the new session's JWT is fully attached, producing an auth.uid() that
--   does not match the supplied p_user_id. The exception then surfaces as
--   a 400 in the browser console (issue #613).
--
--   Functional impact of the old behavior: zero -- the RPC is idempotent
--   and called again on the next sign-in / cache miss. Console noise:
--   significant. This migration converts the user-impersonation guard
--   from a hard error to a silent no-op (logged via RAISE NOTICE so it
--   still appears in Postgres logs for forensic auditing).
--
--   Trigger context (auth.uid() IS NULL, e.g. handle_new_user) is
--   unchanged.
--
-- Down migration:
--   To revert, restore the body of 20260209020000_fix_null_safe_self_guard.sql.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.apply_pending_admin_grants_for_user(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_caller uuid := (select auth.uid());
BEGIN
  -- Self-only guard (quiet variant)
  --   * In trigger / service-role context (auth.uid() IS NULL): allow execution.
  --     handle_new_user() relies on this branch.
  --   * In user context with mismatched p_user_id: log and return 0 instead of
  --     raising. The function is idempotent and the call is non-essential, so
  --     a benign no-op is preferable to a 400 in the browser console.
  IF v_caller IS NOT NULL AND p_user_id IS DISTINCT FROM v_caller THEN
    RAISE NOTICE 'apply_pending_admin_grants_for_user: caller % attempted to apply grants for % -- ignored',
      v_caller, p_user_id;
    RETURN 0;
  END IF;

  IF NOT public.is_user_google_oauth_verified(p_user_id) THEN
    RETURN 0;
  END IF;

  UPDATE public.organization_members om
  SET role = 'admin'
  FROM auth.users u
  WHERE om.user_id = p_user_id
    AND u.id = p_user_id
    AND public.normalize_email(u.email) IN (
      SELECT public.normalize_email(pg.email)
      FROM public.organization_role_grants_pending pg
      WHERE pg.status = 'pending'
        AND pg.organization_id = om.organization_id
    )
    AND om.role = 'member';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.organization_role_grants_pending pg
  SET status = 'applied',
      applied_user_id = p_user_id,
      applied_at = now()
  FROM auth.users u
  WHERE u.id = p_user_id
    AND pg.status = 'pending'
    AND public.normalize_email(pg.email) = public.normalize_email(u.email);

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.apply_pending_admin_grants_for_user(uuid) IS
  'Promotes the supplied user to admin in any organization that has a matching '
  'pending grant (by normalized email). Self-only when called in user context '
  '(quiet no-op on mismatch); permissive in trigger / service-role context. '
  'Idempotent and safe to call repeatedly.';
