-- pgTAP coverage for Google Workspace access contract.
-- Claimed domains must not grant membership by domain alone, and Workspace
-- sync must revoke only Workspace-derived access.

BEGIN;
SELECT plan(14);

CREATE TEMP TABLE gws_contract_ids (
  label text PRIMARY KEY,
  id uuid NOT NULL
);

INSERT INTO gws_contract_ids (label, id) VALUES
  ('org', '18000000-0000-0000-0000-000000000001'::uuid),
  ('admin', '18000000-0000-0000-0000-000000000002'::uuid),
  ('unapproved', '18000000-0000-0000-0000-000000000003'::uuid),
  ('claimed', '18000000-0000-0000-0000-000000000004'::uuid),
  ('manual', '18000000-0000-0000-0000-000000000005'::uuid),
  ('dir-active', '18000000-0000-0000-0000-000000000006'::uuid),
  ('dir-stale', '18000000-0000-0000-0000-000000000007'::uuid),
  ('dir-suspended', '18000000-0000-0000-0000-000000000008'::uuid);

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  (SELECT id FROM gws_contract_ids WHERE label = 'admin'),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'workspace-admin@contract.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "Workspace Admin"}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, name, plan, member_count, max_members, features)
VALUES (
  (SELECT id FROM gws_contract_ids WHERE label = 'org'),
  'Workspace Contract Org',
  'free',
  1,
  10,
  ARRAY['Equipment Management', 'Work Orders', 'Team Management']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_members (organization_id, user_id, role, status)
VALUES (
  (SELECT id FROM gws_contract_ids WHERE label = 'org'),
  (SELECT id FROM gws_contract_ids WHERE label = 'admin'),
  'owner',
  'active'
) ON CONFLICT (organization_id, user_id) DO NOTHING;

INSERT INTO public.workspace_domains (domain, organization_id)
VALUES ('contract.test', (SELECT id FROM gws_contract_ids WHERE label = 'org'))
ON CONFLICT (domain) DO UPDATE SET organization_id = EXCLUDED.organization_id;

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  (SELECT id FROM gws_contract_ids WHERE label = 'unapproved'),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'unapproved@contract.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "google", "providers": ["google"]}'::jsonb,
  '{"name": "Unapproved Workspace User"}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

SELECT is(
  (SELECT count(*)::integer
     FROM public.organization_members
    WHERE organization_id = (SELECT id FROM gws_contract_ids WHERE label = 'org')
      AND user_id = (SELECT id FROM gws_contract_ids WHERE label = 'unapproved')
      AND status = 'active'),
  0,
  'claimed Workspace domain does not auto-join a Google user by domain alone'
);

SELECT is(
  (SELECT count(*)::integer
     FROM public.personal_organizations
    WHERE user_id = (SELECT id FROM gws_contract_ids WHERE label = 'unapproved')),
  1,
  'unapproved claimed-domain user keeps a personal organization instead of entering the Workspace org'
);

INSERT INTO public.google_workspace_directory_users (
  id,
  organization_id,
  google_user_id,
  primary_email,
  full_name,
  suspended,
  last_synced_at
) VALUES
  ((SELECT id FROM gws_contract_ids WHERE label = 'dir-active'), (SELECT id FROM gws_contract_ids WHERE label = 'org'), 'g-active', 'claimed@contract.test', 'Claimed Active', false, '2026-06-12T20:00:00Z'),
  ((SELECT id FROM gws_contract_ids WHERE label = 'dir-suspended'), (SELECT id FROM gws_contract_ids WHERE label = 'org'), 'g-suspended', 'suspended@contract.test', 'Suspended User', true, '2026-06-12T20:00:00Z')
ON CONFLICT (organization_id, google_user_id) DO UPDATE
SET primary_email = EXCLUDED.primary_email,
    full_name = EXCLUDED.full_name,
    suspended = EXCLUDED.suspended,
    last_synced_at = EXCLUDED.last_synced_at;

SELECT set_config('request.jwt.claim.sub', (SELECT id::text FROM gws_contract_ids WHERE label = 'admin'), true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', (SELECT id::text FROM gws_contract_ids WHERE label = 'admin'))::text,
  true
);

SELECT throws_ok(
  $$
    SELECT public.select_google_workspace_members(
      '18000000-0000-0000-0000-000000000001'::uuid,
      ARRAY['not-in-directory@contract.test'],
      ARRAY[]::text[]
    )
  $$,
  'One or more emails are not active Google Workspace directory users for this organization: not-in-directory@contract.test',
  'Workspace import rejects arbitrary same-domain emails that are absent from the directory cache'
);

SELECT throws_ok(
  $$
    SELECT public.select_google_workspace_members(
      '18000000-0000-0000-0000-000000000001'::uuid,
      ARRAY['suspended@contract.test'],
      ARRAY[]::text[]
    )
  $$,
  'One or more emails are not active Google Workspace directory users for this organization: suspended@contract.test',
  'Workspace import rejects suspended directory users'
);

SELECT lives_ok(
  $$
    SELECT public.select_google_workspace_members(
      '18000000-0000-0000-0000-000000000001'::uuid,
      ARRAY['claimed@contract.test'],
      ARRAY[]::text[]
    )
  $$,
  'Workspace import accepts an active directory user'
);

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  (SELECT id FROM gws_contract_ids WHERE label = 'claimed'),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'claimed@contract.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "google", "providers": ["google"]}'::jsonb,
  '{"name": "Claimed Workspace User"}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

SELECT is(
  (SELECT status
     FROM public.organization_member_claims
    WHERE organization_id = (SELECT id FROM gws_contract_ids WHERE label = 'org')
      AND public.normalize_email(email) = 'claimed@contract.test'),
  'claimed',
  'selected Workspace claim is marked claimed after matching Google user signs in'
);

SELECT is(
  (SELECT membership_source
     FROM public.organization_members
    WHERE organization_id = (SELECT id FROM gws_contract_ids WHERE label = 'org')
      AND user_id = (SELECT id FROM gws_contract_ids WHERE label = 'claimed')),
  'google_workspace',
  'Workspace-imported membership is attributed as google_workspace'
);

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  (SELECT id FROM gws_contract_ids WHERE label = 'manual'),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'manual@contract.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "google", "providers": ["google"]}'::jsonb,
  '{"name": "Manual Workspace User"}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_members (
  organization_id,
  user_id,
  role,
  status,
  membership_source
) VALUES (
  (SELECT id FROM gws_contract_ids WHERE label = 'org'),
  (SELECT id FROM gws_contract_ids WHERE label = 'manual'),
  'member',
  'active',
  'manual'
) ON CONFLICT (organization_id, user_id) DO UPDATE
SET status = 'active',
    membership_source = 'manual';

INSERT INTO public.organization_member_claims (
  organization_id,
  email,
  source,
  status,
  created_by,
  claimed_user_id,
  claimed_at
) VALUES (
  (SELECT id FROM gws_contract_ids WHERE label = 'org'),
  'manual@contract.test',
  'google_workspace',
  'claimed',
  (SELECT id FROM gws_contract_ids WHERE label = 'admin'),
  (SELECT id FROM gws_contract_ids WHERE label = 'manual'),
  now()
) ON CONFLICT (organization_id, public.normalize_email(email)) WHERE status IN ('selected', 'claimed')
DO UPDATE SET status = 'claimed',
              claimed_user_id = EXCLUDED.claimed_user_id,
              claimed_at = EXCLUDED.claimed_at;

INSERT INTO public.google_workspace_directory_users (
  id,
  organization_id,
  google_user_id,
  primary_email,
  full_name,
  suspended,
  last_synced_at
) VALUES (
  (SELECT id FROM gws_contract_ids WHERE label = 'dir-stale'),
  (SELECT id FROM gws_contract_ids WHERE label = 'org'),
  'g-stale',
  'claimed@contract.test',
  'Claimed Stale',
  false,
  '2026-06-12T19:00:00Z'
) ON CONFLICT (organization_id, google_user_id) DO UPDATE
SET primary_email = EXCLUDED.primary_email,
    suspended = EXCLUDED.suspended,
    last_synced_at = EXCLUDED.last_synced_at;

SELECT has_function(
  'public',
  'reconcile_google_workspace_directory_snapshot',
  ARRAY['uuid', 'timestamp with time zone'],
  'directory reconciliation RPC exists'
);

SELECT lives_ok(
  $$
    SELECT public.reconcile_google_workspace_directory_snapshot(
      '18000000-0000-0000-0000-000000000001'::uuid,
      '2026-06-12T20:00:00Z'::timestamptz
    )
  $$,
  'directory reconciliation runs for a completed sync snapshot'
);

SELECT is(
  (SELECT status
     FROM public.organization_members
    WHERE organization_id = (SELECT id FROM gws_contract_ids WHERE label = 'org')
      AND user_id = (SELECT id FROM gws_contract_ids WHERE label = 'claimed')),
  'inactive',
  'sync deactivates Workspace-derived membership when user is absent from the active snapshot'
);

SELECT is(
  (SELECT status
     FROM public.organization_member_claims
    WHERE organization_id = (SELECT id FROM gws_contract_ids WHERE label = 'org')
      AND public.normalize_email(email) = 'claimed@contract.test'),
  'revoked',
  'sync revokes Workspace-derived claim when user is absent from the active snapshot'
);

SELECT is(
  (SELECT status
     FROM public.organization_members
    WHERE organization_id = (SELECT id FROM gws_contract_ids WHERE label = 'org')
      AND user_id = (SELECT id FROM gws_contract_ids WHERE label = 'manual')),
  'active',
  'sync preserves separately manual memberships even when a Workspace claim is revoked'
);

INSERT INTO public.google_workspace_credentials (
  organization_id,
  domain,
  refresh_token,
  access_token_expires_at,
  scopes
) VALUES (
  (SELECT id FROM gws_contract_ids WHERE label = 'org'),
  'contract.test',
  'encrypted-token-placeholder',
  now() + interval '1 hour',
  'https://www.googleapis.com/auth/admin.directory.user.readonly'
) ON CONFLICT DO NOTHING;

SELECT lives_ok(
  $$
    SELECT public.disconnect_google_workspace(
      '18000000-0000-0000-0000-000000000001'::uuid,
      false
    )
  $$,
  'disconnect_google_workspace runs without unclaiming domain'
);

SELECT is(
  (SELECT count(*)::integer
     FROM public.google_workspace_directory_users
    WHERE organization_id = (SELECT id FROM gws_contract_ids WHERE label = 'org')),
  0,
  'disconnect clears google_workspace_directory_users cache'
);

SELECT is(
  (SELECT count(*)::integer
     FROM public.workspace_domains
    WHERE domain = 'contract.test'
      AND organization_id = (SELECT id FROM gws_contract_ids WHERE label = 'org')),
  1,
  'disconnect keeps workspace domain claimed by default'
);

SELECT * FROM finish();
ROLLBACK;
BEGIN;
SELECT plan(8);

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

-- TEST 6: disconnect clears directory cache but keeps domain claimed
RESET role;
SELECT set_config('request.jwt.claims', '{"sub":"40000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SET LOCAL role = 'authenticated';

INSERT INTO google_workspace_credentials (
  organization_id, domain, refresh_token, access_token_expires_at
) VALUES (
  '40000000-aaaa-0000-0000-000000000001'::uuid,
  'claimed-contract.test',
  'encrypted-test-token',
  now() + interval '1 hour'
) ON CONFLICT DO NOTHING;

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
  1,
  'disconnect keeps workspace_domains claimed by default'
);

-- TEST 7: reconcile deactivates workspace-derived members when directory user is suspended
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

RESET role;
SET LOCAL role = 'service_role';

UPDATE google_workspace_directory_users
SET suspended = true
WHERE organization_id = '40000000-aaaa-0000-0000-000000000001'::uuid
  AND google_user_id = 'gw-active-1';

SELECT is(
  (public.reconcile_google_workspace_directory(
    '40000000-aaaa-0000-0000-000000000001'::uuid,
    ARRAY['gw-active-1']
  )->>'members_deactivated')::int,
  1,
  'reconcile deactivates workspace-derived members for suspended directory users'
);

-- TEST 8: reconcile function is service_role only
SELECT is(
  has_function_privilege('authenticated', 'public.reconcile_google_workspace_directory(uuid, text[])', 'EXECUTE'),
  false,
  'reconcile_google_workspace_directory is not executable by authenticated'
);

SELECT * FROM finish();
ROLLBACK;
