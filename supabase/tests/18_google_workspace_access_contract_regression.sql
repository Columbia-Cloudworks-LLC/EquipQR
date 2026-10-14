-- pgTAP regression coverage for the Google Workspace access contract:
-- claimed domains, invitations, and Workspace-derived membership revocation.
-- Split from 18_google_workspace_access_contract.sql (one plan per TAP file).

BEGIN;
SELECT plan(10);

-- ============================================
-- Google Workspace access contract regression
-- ============================================

INSERT INTO organizations (id, name, plan, member_count, max_members)
VALUES ('40000000-aaaa-0000-0000-000000000001'::uuid, 'GWS Contract Org', 'free', 1, 25)
ON CONFLICT (id) DO NOTHING;

INSERT INTO workspace_domains (domain, organization_id)
VALUES ('claimed-contract.test', '40000000-aaaa-0000-0000-000000000001'::uuid)
ON CONFLICT (domain) DO NOTHING;

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '40000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'admin@claimed-contract.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "google", "providers": ["google"]}'::jsonb,
  '{"name": "GWS Admin"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
VALUES (
  '40000000-1111-0000-0000-000000000001'::uuid,
  '40000000-0000-0000-0000-000000000001'::uuid,
  'google',
  'google-admin-claimed-contract',
  '{"email": "admin@claimed-contract.test"}'::jsonb,
  NOW(), NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO organization_members (organization_id, user_id, role, status, access_source)
VALUES (
  '40000000-aaaa-0000-0000-000000000001'::uuid,
  '40000000-0000-0000-0000-000000000001'::uuid,
  'owner', 'active', 'owner'
) ON CONFLICT DO NOTHING;

INSERT INTO google_workspace_directory_users (
  organization_id, google_user_id, primary_email, full_name, suspended
) VALUES
  ('40000000-aaaa-0000-0000-000000000001'::uuid, 'gw-active-1', 'active.user@claimed-contract.test', 'Active User', false),
  ('40000000-aaaa-0000-0000-000000000001'::uuid, 'gw-suspended-1', 'suspended.user@claimed-contract.test', 'Suspended User', true)
ON CONFLICT DO NOTHING;

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '40000000-0000-0000-0000-000000000004'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'active.user@claimed-contract.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "google", "providers": ["google"]}'::jsonb,
  '{"name": "Active User"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- TEST 1: claimed-domain Google user without claim does not auto-join workspace org
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '40000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'unauthorized@claimed-contract.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "google", "providers": ["google"]}'::jsonb,
  '{"name": "Unauthorized User"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
);

INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
VALUES (
  '40000000-1111-0000-0000-000000000002'::uuid,
  '40000000-0000-0000-0000-000000000002'::uuid,
  'google',
  'google-unauthorized-claimed-contract',
  '{"email": "unauthorized@claimed-contract.test"}'::jsonb,
  NOW(), NOW()
);

SELECT is(
  (SELECT count(*)::int
   FROM organization_members
   WHERE organization_id = '40000000-aaaa-0000-0000-000000000001'::uuid
     AND user_id = '40000000-0000-0000-0000-000000000002'::uuid
     AND status = 'active'),
  0,
  'claimed-domain Google user without claim does not auto-join workspace org'
);

-- TEST 2: claimed-domain user with selected claim does join workspace org
INSERT INTO organization_member_claims (
  organization_id, email, source, status, created_by
) VALUES (
  '40000000-aaaa-0000-0000-000000000001'::uuid,
  'authorized@claimed-contract.test',
  'google_workspace',
  'selected',
  '40000000-0000-0000-0000-000000000001'::uuid
);

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '40000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authorized@claimed-contract.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "google", "providers": ["google"]}'::jsonb,
  '{"name": "Authorized User"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
);

INSERT INTO auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at)
VALUES (
  '40000000-1111-0000-0000-000000000003'::uuid,
  '40000000-0000-0000-0000-000000000003'::uuid,
  'google',
  'google-authorized-claimed-contract',
  '{"email": "authorized@claimed-contract.test"}'::jsonb,
  NOW(), NOW()
);

SELECT is(
  (SELECT count(*)::int
   FROM organization_members
   WHERE organization_id = '40000000-aaaa-0000-0000-000000000001'::uuid
     AND user_id = '40000000-0000-0000-0000-000000000003'::uuid
     AND status = 'active'
     AND access_source = 'google_workspace'),
  1,
  'claimed-domain user with selected claim joins workspace org with google_workspace source'
);

-- TEST 3: import rejects emails not in directory cache
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"40000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT throws_like(
  $$SELECT public.select_google_workspace_members(
      '40000000-aaaa-0000-0000-000000000001'::uuid,
      ARRAY['missing.user@claimed-contract.test'],
      ARRAY[]::text[]
    )$$,
  '%not active Google Workspace directory users%',
  'import rejects emails missing from directory cache'
);

-- TEST 4: import rejects suspended directory users
SELECT throws_like(
  $$SELECT public.select_google_workspace_members(
      '40000000-aaaa-0000-0000-000000000001'::uuid,
      ARRAY['suspended.user@claimed-contract.test'],
      ARRAY[]::text[]
    )$$,
  '%not active Google Workspace directory users%',
  'import rejects suspended directory users'
);

-- TEST 5: import accepts active directory users
SELECT lives_ok(
  $$SELECT public.select_google_workspace_members(
      '40000000-aaaa-0000-0000-000000000001'::uuid,
      ARRAY['active.user@claimed-contract.test'],
      ARRAY[]::text[]
    )$$,
  'import accepts active directory users'
);

-- TEST 6: disconnect clears directory cache and releases domain claim
RESET role;
SET LOCAL role = 'service_role';

INSERT INTO workspace_domains (domain, organization_id)
VALUES ('extra-contract.test', '40000000-aaaa-0000-0000-000000000001'::uuid)
ON CONFLICT (domain) DO NOTHING;

INSERT INTO google_workspace_credentials (
  organization_id, domain, refresh_token, access_token_expires_at
) VALUES (
  '40000000-aaaa-0000-0000-000000000001'::uuid,
  'claimed-contract.test',
  'encrypted-test-token',
  now() + interval '1 hour'
) ON CONFLICT DO NOTHING;

RESET role;
SELECT set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SET LOCAL role = 'authenticated';

SELECT is(
  (public.disconnect_google_workspace(
    '40000000-aaaa-0000-0000-000000000001'::uuid,
    false
  )->>'directory_users_deleted')::int,
  2,
  'disconnect removes cached directory users'
);

SELECT is(
  (SELECT count(*)::int FROM workspace_domains WHERE domain = 'claimed-contract.test'),
  0,
  'disconnect releases workspace_domains claim'
);

SELECT is(
  (SELECT count(*)::int
     FROM workspace_domains
    WHERE organization_id = '40000000-aaaa-0000-0000-000000000001'::uuid),
  0,
  'disconnect releases all workspace domain claims for the organization'
);

-- TEST 7: reconcile deactivates workspace-derived members when directory user is suspended.
-- Two Workspace-derived members are active here: active.user@ (TEST 5, now
-- suspended) and authorized@ (TEST 2, never in the directory cache). Both lose
-- access because neither has an active directory entry.
RESET role;
SET LOCAL role = 'service_role';

INSERT INTO google_workspace_directory_users (
  organization_id, google_user_id, primary_email, full_name, suspended
) VALUES (
  '40000000-aaaa-0000-0000-000000000001'::uuid,
  'gw-active-1',
  'active.user@claimed-contract.test',
  'Active User',
  false
) ON CONFLICT (organization_id, google_user_id) DO UPDATE
  SET suspended = false;

UPDATE google_workspace_directory_users
SET suspended = true
WHERE organization_id = '40000000-aaaa-0000-0000-000000000001'::uuid
  AND google_user_id = 'gw-active-1';

SELECT is(
  (public.reconcile_google_workspace_directory(
    '40000000-aaaa-0000-0000-000000000001'::uuid,
    now()
  )->>'members_deactivated')::int,
  2,
  'reconcile deactivates workspace-derived members without an active directory entry'
);

-- TEST 8: reconcile function is service_role only
SELECT is(
  has_function_privilege('authenticated', 'public.reconcile_google_workspace_directory(uuid, timestamptz)', 'EXECUTE'),
  false,
  'reconcile_google_workspace_directory is not executable by authenticated'
);

SELECT * FROM finish();
ROLLBACK;
