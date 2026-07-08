BEGIN;
SELECT plan(27);

-- ============================================
-- Test: quick forms domain RLS (#1184)
-- Owner/admin-only access; public access via token RPCs only.
-- ============================================

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '41000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'quickform-owner-a@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "QuickForm Owner A"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
), (
  '41000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'quickform-owner-b@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "QuickForm Owner B"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
), (
  '41000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'quickform-member-a@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "QuickForm Member A"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO organizations (id, name, plan, member_count, max_members)
VALUES
  ('41000000-aaaa-0000-0000-000000000001'::uuid, 'QuickForm Org A', 'free', 2, 10),
  ('41000000-aaaa-0000-0000-000000000002'::uuid, 'QuickForm Org B', 'free', 1, 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO organization_members (user_id, organization_id, role, status, joined_date)
VALUES
  ('41000000-0000-0000-0000-000000000001'::uuid, '41000000-aaaa-0000-0000-000000000001'::uuid, 'owner', 'active', NOW()),
  ('41000000-0000-0000-0000-000000000002'::uuid, '41000000-aaaa-0000-0000-000000000002'::uuid, 'owner', 'active', NOW()),
  ('41000000-0000-0000-0000-000000000003'::uuid, '41000000-aaaa-0000-0000-000000000001'::uuid, 'member', 'active', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.quick_forms (id, organization_id, name, description, form_data, is_active, public_token_hash, created_by)
VALUES
  (
    '41000000-cccc-0000-0000-000000000001'::uuid,
    '41000000-aaaa-0000-0000-000000000001'::uuid,
    'Time Sheet A',
    'Job site time sheet',
    '{"fields":[{"id":"f1","label":"Employee name","inputType":"text","required":true}]}'::jsonb,
    true,
    encode(digest('qf-token-a', 'sha256'), 'hex'),
    '41000000-0000-0000-0000-000000000001'::uuid
  ),
  (
    '41000000-cccc-0000-0000-000000000002'::uuid,
    '41000000-aaaa-0000-0000-000000000002'::uuid,
    'Security Check B',
    NULL,
    '{"fields":[{"id":"f1","label":"Badge number","inputType":"text","required":true}]}'::jsonb,
    true,
    encode(digest('qf-token-b', 'sha256'), 'hex'),
    '41000000-0000-0000-0000-000000000002'::uuid
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quick_form_token_secrets (quick_form_id, organization_id, raw_token)
VALUES (
  '41000000-cccc-0000-0000-000000000001'::uuid,
  '41000000-aaaa-0000-0000-000000000001'::uuid,
  'qf-token-a'
) ON CONFLICT (quick_form_id) DO NOTHING;

INSERT INTO public.quick_form_submissions (
  id, organization_id, quick_form_id, submitted_at, form_snapshot, field_values, client_context
) VALUES (
  '41000000-eeee-0000-0000-000000000001'::uuid,
  '41000000-aaaa-0000-0000-000000000001'::uuid,
  '41000000-cccc-0000-0000-000000000001'::uuid,
  NOW(),
  '{"name":"Time Sheet A"}'::jsonb,
  '[{"field_id":"f1","label":"Employee name","input_type":"text","value":"Jane Worker"}]'::jsonb,
  '{"submitted_timestamp":"2026-07-08T00:00:00Z","browser_timezone":"America/Chicago"}'::jsonb
);

SELECT has_table('public', 'quick_forms', 'quick_forms exists');
SELECT has_table('public', 'quick_form_token_secrets', 'quick_form_token_secrets exists');
SELECT has_table('public', 'quick_form_submissions', 'quick_form_submissions exists');

-- Org A owner: full read access within their org
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO '41000000-0000-0000-0000-000000000001';

SELECT ok(
  (SELECT count(*)::int FROM public.quick_forms WHERE organization_id = '41000000-aaaa-0000-0000-000000000001'::uuid) = 1,
  'org owner can read quick forms in their org'
);

SELECT ok(
  (SELECT count(*)::int FROM public.quick_form_submissions WHERE organization_id = '41000000-aaaa-0000-0000-000000000001'::uuid) = 1,
  'org owner can read submissions in their org'
);

SELECT ok(
  (SELECT raw_token FROM public.quick_form_token_secrets WHERE quick_form_id = '41000000-cccc-0000-0000-000000000001'::uuid) = 'qf-token-a',
  'org owner can read the raw QR token secret'
);

-- Org B owner: cross-org isolation
SET LOCAL request.jwt.claim.sub TO '41000000-0000-0000-0000-000000000002';

SELECT ok(
  (SELECT count(*)::int FROM public.quick_forms WHERE organization_id = '41000000-aaaa-0000-0000-000000000001'::uuid) = 0
  AND (SELECT count(*)::int FROM public.quick_forms WHERE organization_id = '41000000-aaaa-0000-0000-000000000002'::uuid) = 1,
  'cross-org quick form isolation'
);

SELECT ok(
  (SELECT count(*)::int FROM public.quick_form_submissions WHERE organization_id = '41000000-aaaa-0000-0000-000000000001'::uuid) = 0,
  'cross-org submission isolation'
);

SELECT ok(
  (SELECT count(*)::int FROM public.quick_form_token_secrets WHERE organization_id = '41000000-aaaa-0000-0000-000000000001'::uuid) = 0,
  'cross-org token secret isolation'
);

-- Plain member: quick form data may be sensitive; members get no access at all
SET LOCAL request.jwt.claim.sub TO '41000000-0000-0000-0000-000000000003';

SELECT ok(
  (SELECT count(*)::int FROM public.quick_forms WHERE organization_id = '41000000-aaaa-0000-0000-000000000001'::uuid) = 0,
  'plain member cannot read quick forms'
);

SELECT ok(
  (SELECT count(*)::int FROM public.quick_form_submissions WHERE organization_id = '41000000-aaaa-0000-0000-000000000001'::uuid) = 0,
  'plain member cannot read submissions'
);

SELECT ok(
  (SELECT count(*)::int FROM public.quick_form_token_secrets WHERE organization_id = '41000000-aaaa-0000-0000-000000000001'::uuid) = 0,
  'plain member cannot read token secrets'
);

SELECT throws_ok(
  $$ SELECT public.create_quick_form(
       '41000000-aaaa-0000-0000-000000000001'::uuid,
       'Member Form', NULL, '{"fields":[]}'::jsonb) $$,
  'Forbidden',
  'plain member cannot create quick forms'
);

-- Anon: no direct table access (table grants revoked); resolve RPC works for
-- active forms only.
SET LOCAL role TO anon;

SELECT throws_ok(
  $$ SELECT count(*) FROM public.quick_forms $$,
  '42501',
  NULL,
  'anon cannot read quick forms directly'
);

SELECT throws_ok(
  $$ SELECT count(*) FROM public.quick_form_submissions $$,
  '42501',
  NULL,
  'anon cannot read submissions directly'
);

SELECT ok(
  public.resolve_quick_form_by_token(encode(digest('qf-token-a', 'sha256'), 'hex')) IS NOT NULL,
  'anon can resolve an active form by token hash'
);

SELECT ok(
  public.resolve_quick_form_by_token(encode(digest('wrong-token', 'sha256'), 'hex')) IS NULL,
  'unknown token resolves to NULL'
);

RESET role;

SELECT ok(
  (SELECT count(*)::int FROM pg_policies WHERE tablename = 'quick_forms' AND cmd = 'INSERT') = 0,
  'no direct INSERT policy on quick_forms (create RPC only)'
);

SELECT ok(
  (SELECT count(*)::int FROM pg_policies WHERE tablename = 'quick_form_submissions' AND cmd = 'INSERT') = 0,
  'no direct INSERT policy on submissions (edge function only)'
);

-- Owner A: create + rotate lifecycle
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO '41000000-0000-0000-0000-000000000001';

SELECT ok(
  (SELECT raw_token FROM public.create_quick_form(
    '41000000-aaaa-0000-0000-000000000001'::uuid,
    'Assembly Line Check',
    'Line 3 checks',
    '{"fields":[{"id":"f1","label":"Station","inputType":"text","required":true}]}'::jsonb
  )) IS NOT NULL,
  'org owner creates a quick form and receives a raw token'
);

SELECT ok(
  (SELECT count(*)::int FROM public.quick_forms
    WHERE organization_id = '41000000-aaaa-0000-0000-000000000001'::uuid
      AND name = 'Assembly Line Check') = 1,
  'created quick form is readable by the owner'
);

SELECT ok(
  (SELECT count(*)::int FROM public.quick_form_token_secrets s
    JOIN public.quick_forms f ON f.id = s.quick_form_id
    WHERE f.name = 'Assembly Line Check') = 1,
  'created quick form persists its raw token secret'
);

SELECT ok(
  (SELECT raw_token FROM public.rotate_quick_form_token('41000000-cccc-0000-0000-000000000001'::uuid)) IS NOT NULL,
  'org owner rotates the QR token'
);

RESET role;
SET LOCAL role TO anon;

SELECT ok(
  public.resolve_quick_form_by_token(encode(digest('qf-token-a', 'sha256'), 'hex')) IS NULL,
  'old token stops resolving after rotation'
);

RESET role;

-- Public submit RPC (service role path; superuser exercises the definer function)
SELECT ok(
  (public.submit_quick_form_public(
    encode(digest('qf-token-b', 'sha256'), 'hex'),
    '[{"field_id":"f1","label":"Badge number","input_type":"text","value":"1234"}]'::jsonb,
    '{"submitted_timestamp":"2026-07-08T00:00:00Z"}'::jsonb,
    '{"name":"Security Check B"}'::jsonb,
    NULL
  ) ->> 'id') IS NOT NULL,
  'submit_quick_form_public inserts a submission for an active form'
);

UPDATE public.quick_forms
SET is_active = false
WHERE id = '41000000-cccc-0000-0000-000000000002'::uuid;

SELECT throws_ok(
  $$ SELECT public.submit_quick_form_public(
       encode(digest('qf-token-b', 'sha256'), 'hex'),
       '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, NULL) $$,
  'Form is not available',
  'submissions are rejected for deactivated forms'
);

SELECT ok(
  public.resolve_quick_form_by_token(encode(digest('qf-token-b', 'sha256'), 'hex')) IS NULL,
  'deactivated form token stops resolving'
);

SELECT * FROM finish();
ROLLBACK;
