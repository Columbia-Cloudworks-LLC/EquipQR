-- Fix production signup failures caused by a stale function body that still
-- queried auth.users.identities. Supabase stores provider identities in
-- auth.identities, and auth.users has no identities column.

CREATE OR REPLACE FUNCTION public.is_user_google_oauth_verified(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_google_identity boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM auth.identities i
    WHERE i.user_id = p_user_id
      AND i.provider = 'google'
  )
  INTO has_google_identity;

  RETURN has_google_identity;
END;
$$;

COMMENT ON FUNCTION public.is_user_google_oauth_verified(uuid) IS
  'Returns true if the user has a Google OAuth identity. Used to gate admin grants.';

GRANT EXECUTE ON FUNCTION public.is_user_google_oauth_verified(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_user_google_oauth_verified(uuid) FROM anon;
