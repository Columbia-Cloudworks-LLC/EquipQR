-- =============================================================================
-- Migration: fix_security_hardening
-- Purpose: Address security vulnerabilities found during audit
--   1A. Drop duplicate insecure RLS policies on preventative_maintenance (CRITICAL)
--   1B. Restrict apply_pending_admin_grants_for_user to self-only (HIGH)
--   1C. Revoke anon grant from is_user_google_oauth_verified (LOW)
-- =============================================================================

-- =============================================================================
-- 1A. Drop insecure duplicate RLS policies on preventative_maintenance
-- =============================================================================
-- The baseline migration created both insecure and _consolidated versions of
-- INSERT/UPDATE policies. PostgreSQL OR-combines multiple policies, so the
-- insecure policies (which only check that organization_id exists, not that the
-- user is a member) effectively bypass the membership checks in the consolidated
-- policies. Dropping the insecure ones leaves only the secure _consolidated
-- versions that enforce is_org_member() / is_org_admin().
DROP POLICY IF EXISTS "preventative_maintenance_insert" ON public.preventative_maintenance;
DROP POLICY IF EXISTS "preventative_maintenance_update" ON public.preventative_maintenance;

-- =============================================================================
-- 1B. Restrict apply_pending_admin_grants_for_user to self-only
-- =============================================================================
-- This SECURITY DEFINER function was callable by any authenticated user with an
-- arbitrary p_user_id, allowing User A to trigger admin grant application for
-- User B. Adding an auth.uid() guard ensures users can only apply their own
-- pending grants.
--
-- NOTE: The handle_new_user() trigger calls this function in a trigger context
-- where auth.uid() IS NULL (service-role/trigger context). The follow-up
-- migration 20260209020000 fixes this guard to be NULL-safe using
-- `(select auth.uid()) IS NOT NULL AND p_user_id IS DISTINCT FROM (select auth.uid())`.
CREATE OR REPLACE FUNCTION public.apply_pending_admin_grants_for_user(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
BEGIN
  -- Security: only allow users to apply their own grants
  -- NOTE: In trigger context (handle_new_user), auth.uid() IS NULL -- see
  -- migration 20260209020000 for the NULL-safe version of this guard
  IF p_user_id != auth.uid() THEN
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

-- =============================================================================
-- 1C. Revoke anon grant from is_user_google_oauth_verified
-- =============================================================================
-- This SECURITY DEFINER function queries auth.identities to check if a user has
-- a Google OAuth identity. Anonymous users should not be able to probe this
-- information. The function remains accessible to authenticated and service_role.
REVOKE ALL ON FUNCTION public.is_user_google_oauth_verified(uuid) FROM anon;
