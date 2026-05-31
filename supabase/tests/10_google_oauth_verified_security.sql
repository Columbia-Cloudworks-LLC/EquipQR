-- pgTAP coverage for public.is_user_google_oauth_verified privilege posture.
-- Ensures the auth-identity probe stays off the authenticated Data API surface.

BEGIN;
SELECT plan(7);

-- 1. Function exists with expected signature.
SELECT has_function(
  'public',
  'is_user_google_oauth_verified',
  ARRAY['uuid'],
  'public.is_user_google_oauth_verified(uuid) exists'
);

-- 2. Function is SECURITY DEFINER.
SELECT is(
  (SELECT prosecdef
     FROM pg_proc
     WHERE proname = 'is_user_google_oauth_verified'
       AND pronamespace = 'public'::regnamespace
     LIMIT 1),
  true,
  'is_user_google_oauth_verified is SECURITY DEFINER'
);

-- 3. search_path is pinned.
SELECT ok(
  (SELECT proconfig IS NOT NULL AND array_to_string(proconfig, ',') LIKE '%search_path=%'
     FROM pg_proc
     WHERE proname = 'is_user_google_oauth_verified'
       AND pronamespace = 'public'::regnamespace
     LIMIT 1),
  'is_user_google_oauth_verified has pinned search_path'
);

-- 4. EXECUTE not granted to PUBLIC (grantee OID 0 in aclexplode).
SELECT is(
  (SELECT NOT EXISTS (
     SELECT 1
     FROM pg_proc p,
          aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS acl
     WHERE p.proname = 'is_user_google_oauth_verified'
       AND p.pronamespace = 'public'::regnamespace
       AND acl.grantee = 0
       AND acl.privilege_type = 'EXECUTE'
   )),
  true,
  'EXECUTE on is_user_google_oauth_verified not granted to PUBLIC'
);

-- 5. EXECUTE not granted to anon.
SELECT is(
  (SELECT has_function_privilege(
             'anon',
             'public.is_user_google_oauth_verified(uuid)',
             'EXECUTE')),
  false,
  'EXECUTE on is_user_google_oauth_verified not granted to anon'
);

-- 6. EXECUTE not granted to authenticated.
SELECT is(
  (SELECT has_function_privilege(
             'authenticated',
             'public.is_user_google_oauth_verified(uuid)',
             'EXECUTE')),
  false,
  'EXECUTE on is_user_google_oauth_verified not granted to authenticated'
);

-- 7. EXECUTE granted to service_role.
SELECT is(
  (SELECT has_function_privilege(
             'service_role',
             'public.is_user_google_oauth_verified(uuid)',
             'EXECUTE')),
  true,
  'EXECUTE on is_user_google_oauth_verified granted to service_role'
);

SELECT * FROM finish();
ROLLBACK;
