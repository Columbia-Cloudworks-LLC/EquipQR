-- =============================================================================
-- Migration: fix_null_safe_self_guard
-- Purpose: Fix NULL-safe comparison in apply_pending_admin_grants_for_user
--
-- The original self-only guard used `p_user_id != auth.uid()` which evaluates
-- to NULL (not TRUE) when auth.uid() IS NULL, allowing the function body to
-- execute without authentication.
--
-- However, handle_new_user() calls this function from an auth.users trigger
-- where auth.uid() IS NULL (service-role/trigger context). The guard must
-- allow trigger invocations while still blocking user impersonation.
--
-- Solution: Only enforce the self-check when auth.uid() IS NOT NULL (user
-- context). When auth.uid() IS NULL (trigger/service-role), allow execution.
-- =============================================================================

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
  -- When auth.uid() IS NOT NULL (user context): enforce self-only check
  -- When auth.uid() IS NULL (trigger/service-role context): allow execution
  --   e.g., handle_new_user() trigger calls this during sign-up
  IF (select auth.uid()) IS NOT NULL AND p_user_id IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: can only apply own pending grants'
      USING ERRCODE = '28000'; -- invalid_authorization_specification
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
