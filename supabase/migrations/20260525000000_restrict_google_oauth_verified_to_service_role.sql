-- Restrict is_user_google_oauth_verified to service_role / database callers only.
-- SECURITY DEFINER helpers that accept arbitrary p_user_id must not be exposed as
-- authenticated RPCs; browser clients should call apply_pending_admin_grants_for_user
-- (self-only guarded) instead of probing other users' Google identity state.

REVOKE ALL ON FUNCTION public.is_user_google_oauth_verified(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_user_google_oauth_verified(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_user_google_oauth_verified(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_google_oauth_verified(uuid) TO service_role;
