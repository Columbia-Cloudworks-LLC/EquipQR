-- Security regression tests for public.get_audit_log_timeline (issue #641)
-- and the owner/admin-only audit read contract (issue #1122).
-- Covers:
--   (a) Active admin of org A can read their own org's timeline buckets.
--   (b) Active admin of org A is denied timeline access to org B.
--   (c) p_bucket = 'second' raises a validation error (whitelist works).
--   (d) p_action = 'UPDATE' returns only UPDATE rows (filter passthrough).
--   (e) A plain (non-admin) active member is denied the timeline RPC and
--       reads zero audit_log rows through RLS (#1122).

BEGIN;
SELECT plan(9);

-- ---------------------------------------------------------------------------
-- Auth fixtures: two users, two orgs, one membership each.
-- ---------------------------------------------------------------------------

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
  '11000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'pgtap-audit-admin@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "pgTAP Audit Admin"}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

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
  '11000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'pgtap-audit-outsider@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "pgTAP Audit Outsider"}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

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
  '11000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'pgtap-audit-member@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "pgTAP Audit Member"}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, name)
VALUES
  ('11000000-0000-0000-0000-000000000001'::uuid, 'pgtap-audit-admin@equipqr.test', 'pgTAP Audit Admin'),
  ('11000000-0000-0000-0000-000000000002'::uuid, 'pgtap-audit-outsider@equipqr.test', 'pgTAP Audit Outsider'),
  ('11000000-0000-0000-0000-000000000003'::uuid, 'pgtap-audit-member@equipqr.test', 'pgTAP Audit Member')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, name)
VALUES
  ('91000000-0000-0000-0000-000000000001'::uuid, 'pgTAP Audit Org A'),
  ('91000000-0000-0000-0000-000000000002'::uuid, 'pgTAP Audit Org B')
ON CONFLICT (id) DO NOTHING;

-- Admin is an active member of Org A only. Outsider is a member of Org B only.
-- The plain member is an active non-admin member of Org A (#1122 denial case).
INSERT INTO public.organization_members (organization_id, user_id, role, status)
VALUES
  ('91000000-0000-0000-0000-000000000001'::uuid, '11000000-0000-0000-0000-000000000001'::uuid, 'admin', 'active'),
  ('91000000-0000-0000-0000-000000000002'::uuid, '11000000-0000-0000-0000-000000000002'::uuid, 'admin', 'active'),
  ('91000000-0000-0000-0000-000000000001'::uuid, '11000000-0000-0000-0000-000000000003'::uuid, 'member', 'active')
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Audit fixtures in Org A. Inserted as the default test role (RLS bypass).
-- Five entries spread across two buckets and two actions so that bucket and
-- action filters can be observed independently.
-- ---------------------------------------------------------------------------
INSERT INTO public.audit_log (
  id, organization_id, entity_type, entity_id, entity_name,
  action, actor_id, actor_name, actor_email, changes, metadata, created_at
) VALUES
  ('a1000000-0000-0000-0000-000000000001'::uuid,
   '91000000-0000-0000-0000-000000000001'::uuid,
   'equipment',
   'b1000000-0000-0000-0000-000000000001'::uuid,
   'Forklift A', 'INSERT',
   '11000000-0000-0000-0000-000000000001'::uuid, 'pgTAP Audit Admin', NULL,
   '{}'::jsonb, '{}'::jsonb, NOW() - INTERVAL '2 hours'),
  ('a1000000-0000-0000-0000-000000000002'::uuid,
   '91000000-0000-0000-0000-000000000001'::uuid,
   'equipment',
   'b1000000-0000-0000-0000-000000000002'::uuid,
   'Forklift B', 'INSERT',
   '11000000-0000-0000-0000-000000000001'::uuid, 'pgTAP Audit Admin', NULL,
   '{}'::jsonb, '{}'::jsonb, NOW() - INTERVAL '2 hours'),
  ('a1000000-0000-0000-0000-000000000003'::uuid,
   '91000000-0000-0000-0000-000000000001'::uuid,
   'equipment',
   'b1000000-0000-0000-0000-000000000001'::uuid,
   'Forklift A', 'UPDATE',
   '11000000-0000-0000-0000-000000000001'::uuid, 'pgTAP Audit Admin', NULL,
   '{}'::jsonb, '{}'::jsonb, NOW() - INTERVAL '1 hour'),
  ('a1000000-0000-0000-0000-000000000004'::uuid,
   '91000000-0000-0000-0000-000000000001'::uuid,
   'work_order',
   'c1000000-0000-0000-0000-000000000001'::uuid,
   'WO 1', 'INSERT',
   '11000000-0000-0000-0000-000000000001'::uuid, 'pgTAP Audit Admin', NULL,
   '{}'::jsonb, '{}'::jsonb, NOW() - INTERVAL '30 minutes'),
  ('a1000000-0000-0000-0000-000000000005'::uuid,
   '91000000-0000-0000-0000-000000000001'::uuid,
   'work_order',
   'c1000000-0000-0000-0000-000000000001'::uuid,
   'WO 1', 'UPDATE',
   '11000000-0000-0000-0000-000000000001'::uuid, 'pgTAP Audit Admin', NULL,
   '{}'::jsonb, '{}'::jsonb, NOW() - INTERVAL '5 minutes')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Switch to the admin user (active member of Org A) for access tests.
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '11000000-0000-0000-0000-000000000001')::text,
  true
);
SELECT is(
  auth.uid(),
  '11000000-0000-0000-0000-000000000001'::uuid,
  'auth.uid set for Org A admin'
);

-- (a) Org A member receives at least one bucket for their own org.
SELECT ok(
  (
    SELECT count(*)::int FROM public.get_audit_log_timeline(
      '91000000-0000-0000-0000-000000000001'::uuid,
      'hour',
      NOW() - INTERVAL '1 day',
      NOW() + INTERVAL '1 minute'
    )
  ) > 0,
  'Active Org A member receives timeline buckets for their own org'
);

-- (b) Org A member querying Org B raises 42501 (insufficient_privilege).
SELECT throws_ok(
  $$
    SELECT * FROM public.get_audit_log_timeline(
      '91000000-0000-0000-0000-000000000002'::uuid,
      'hour',
      NOW() - INTERVAL '1 day',
      NOW() + INTERVAL '1 minute'
    )
  $$,
  '42501',
  'access denied',
  'Cross-org timeline read raises 42501 access denied'
);

-- (c) Invalid bucket raises 22023 (invalid_parameter_value) before any
-- aggregation runs.
SELECT throws_ok(
  $$
    SELECT * FROM public.get_audit_log_timeline(
      '91000000-0000-0000-0000-000000000001'::uuid,
      'second',
      NOW() - INTERVAL '1 day',
      NOW() + INTERVAL '1 minute'
    )
  $$,
  '22023',
  NULL,
  'Bucket whitelist rejects unsupported units (second)'
);

-- (d) p_action = 'UPDATE' restricts the result set to UPDATE rows only.
-- Use distinct action count + max(action) so the assertion is robust to
-- audit triggers from earlier fixture inserts.
SELECT is(
  (
    SELECT count(DISTINCT action)::int FROM public.get_audit_log_timeline(
      '91000000-0000-0000-0000-000000000001'::uuid,
      'hour',
      NOW() - INTERVAL '1 day',
      NOW() + INTERVAL '1 minute',
      NULL,
      'UPDATE'
    )
  ),
  1,
  'p_action filter collapses result rows to a single action'
);

SELECT is(
  (
    SELECT max(action) FROM public.get_audit_log_timeline(
      '91000000-0000-0000-0000-000000000001'::uuid,
      'hour',
      NOW() - INTERVAL '1 day',
      NOW() + INTERVAL '1 minute',
      NULL,
      'UPDATE'
    )
  ),
  'UPDATE',
  'p_action=UPDATE returns only UPDATE rows'
);

-- ---------------------------------------------------------------------------
-- (e) Switch to the plain (non-admin) Org A member: audit data must be
-- fully inaccessible — timeline RPC raises 42501 and RLS hides all rows.
-- ---------------------------------------------------------------------------

SELECT set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000003', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '11000000-0000-0000-0000-000000000003')::text,
  true
);
SELECT is(
  auth.uid(),
  '11000000-0000-0000-0000-000000000003'::uuid,
  'auth.uid set for Org A plain member'
);

SELECT throws_ok(
  $$
    SELECT * FROM public.get_audit_log_timeline(
      '91000000-0000-0000-0000-000000000001'::uuid,
      'hour',
      NOW() - INTERVAL '1 day',
      NOW() + INTERVAL '1 minute'
    )
  $$,
  '42501',
  'access denied',
  'Non-admin member timeline read raises 42501 access denied (#1122)'
);

SELECT is(
  (
    SELECT count(*)::int FROM public.audit_log
    WHERE organization_id = '91000000-0000-0000-0000-000000000001'::uuid
  ),
  0,
  'RLS hides all audit_log rows from non-admin members (#1122)'
);

SELECT * FROM finish();
ROLLBACK;
