-- SECURITY DEFINER functions receive EXECUTE for PUBLIC by default unless it is
-- explicitly revoked. Keep this auth-identity probe limited to authenticated
-- callers and service-role code.

REVOKE ALL ON FUNCTION public.is_user_google_oauth_verified(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_user_google_oauth_verified(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_user_google_oauth_verified(uuid) TO authenticated, service_role;
