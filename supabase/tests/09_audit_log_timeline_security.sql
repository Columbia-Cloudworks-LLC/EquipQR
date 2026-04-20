-- Security regression tests for public.get_audit_log_timeline (issue #641).
-- Covers:
--   (a) Active member of org A can read their own org's timeline buckets.
--   (b) Active member of org A is denied timeline access to org B.
--   (c) p_bucket = 'second' raises a validation error (whitelist works).
--   (d) p_action = 'UPDATE' returns only UPDATE rows (filter passthrough).

BEGIN;
SELECT plan(6);

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

INSERT INTO public.profiles (id, email, name)
VALUES
  ('11000000-0000-0000-0000-000000000001'::uuid, 'pgtap-audit-admin@equipqr.test', 'pgTAP Audit Admin'),
  ('11000000-0000-0000-0000-000000000002'::uuid, 'pgtap-audit-outsider@equipqr.test', 'pgTAP Audit Outsider')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, name)
VALUES
  ('91000000-0000-0000-0000-000000000001'::uuid, 'pgTAP Audit Org A'),
  ('91000000-0000-0000-0000-000000000002'::uuid, 'pgTAP Audit Org B')
ON CONFLICT (id) DO NOTHING;

-- Admin is an active member of Org A only. Outsider is a member of Org B only.
INSERT INTO public.organization_members (organization_id, user_id, role, status)
VALUES
  ('91000000-0000-0000-0000-000000000001'::uuid, '11000000-0000-0000-0000-000000000001'::uuid, 'admin', 'active'),
  ('91000000-0000-0000-0000-000000000002'::uuid, '11000000-0000-0000-0000-000000000002'::uuid, 'admin', 'active')
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

SELECT * FROM finish();
ROLLBACK;
