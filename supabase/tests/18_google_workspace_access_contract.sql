-- pgTAP coverage for Google Workspace access contract.
-- Claimed domains must not grant membership by domain alone, and Workspace
-- sync must revoke only Workspace-derived access.

BEGIN;
SELECT plan(16);

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
  0,
  'unapproved claimed-domain user does not get personal-org fallback'
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

SELECT is(
  (SELECT count(*)::integer
     FROM public.get_workspace_onboarding_state(
       (SELECT id FROM gws_contract_ids WHERE label = 'unapproved')
     )),
  0,
  'get_workspace_onboarding_state rejects cross-user lookups for authenticated callers'
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
  (SELECT access_source
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
  access_source
) VALUES (
  (SELECT id FROM gws_contract_ids WHERE label = 'org'),
  (SELECT id FROM gws_contract_ids WHERE label = 'manual'),
  'member',
  'active',
  'manual'
) ON CONFLICT (organization_id, user_id) DO UPDATE
SET status = 'active',
    access_source = 'manual';

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
  'reconcile_google_workspace_directory',
  ARRAY['uuid', 'timestamptz'],
  'directory reconciliation RPC exists'
);

SELECT lives_ok(
  $$
    SELECT public.reconcile_google_workspace_directory(
      '18000000-0000-0000-0000-000000000001'::uuid,
      now()
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
  'disconnect_google_workspace runs and releases domain claim'
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
  0,
  'disconnect releases workspace domain claim'
);

SELECT * FROM finish();
ROLLBACK;
