-- pgTAP coverage for public.get_product_onboarding_status eligibility logic.

BEGIN;
SELECT plan(5);

CREATE TEMP TABLE onboarding_test_context (
  label text PRIMARY KEY,
  org_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  member_id uuid NOT NULL
);

GRANT SELECT ON TABLE onboarding_test_context TO authenticated;

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
) VALUES
  (
    '12000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'pgtap-onboarding-owner@equipqr.test',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "pgTAP Onboarding Owner"}'::jsonb,
    false,
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  ),
  (
    '12000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'pgtap-onboarding-member@equipqr.test',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "pgTAP Onboarding Member"}'::jsonb,
    false,
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, name)
VALUES ('91000000-0000-0000-0000-000000000001'::uuid, 'pgTAP Onboarding Org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, name)
VALUES
  ('12000000-0000-0000-0000-000000000001'::uuid, 'pgtap-onboarding-owner@equipqr.test', 'pgTAP Onboarding Owner'),
  ('12000000-0000-0000-0000-000000000002'::uuid, 'pgtap-onboarding-member@equipqr.test', 'pgTAP Onboarding Member')
ON CONFLICT (id) DO NOTHING;

INSERT INTO onboarding_test_context (label, org_id, owner_id, member_id)
VALUES (
  'onboarding_org',
  '91000000-0000-0000-0000-000000000001'::uuid,
  '12000000-0000-0000-0000-000000000001'::uuid,
  '12000000-0000-0000-0000-000000000002'::uuid
);

INSERT INTO public.organization_members (organization_id, user_id, role, status)
VALUES
  (
    (SELECT org_id FROM onboarding_test_context WHERE label = 'onboarding_org'),
    (SELECT owner_id FROM onboarding_test_context WHERE label = 'onboarding_org'),
    'owner',
    'active'
  ),
  (
    (SELECT org_id FROM onboarding_test_context WHERE label = 'onboarding_org'),
    (SELECT member_id FROM onboarding_test_context WHERE label = 'onboarding_org'),
    'member',
    'active'
  );

-- Owner, empty org → needs onboarding
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000001', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '12000000-0000-0000-0000-000000000001')::text,
  true
);

SELECT is(
  (SELECT needs_onboarding
     FROM public.get_product_onboarding_status('91000000-0000-0000-0000-000000000001'::uuid)),
  true,
  'Owner with empty org needs onboarding'
);

-- Owner, teams + equipment, null completed_at → bypass wizard
INSERT INTO public.teams (id, organization_id, name)
VALUES (
  '92000000-0000-0000-0000-000000000001'::uuid,
  '91000000-0000-0000-0000-000000000001'::uuid,
  'Established Team'
);

INSERT INTO public.equipment (
  id,
  organization_id,
  name,
  manufacturer,
  model,
  serial_number,
  status,
  location,
  installation_date
) VALUES (
  '93000000-0000-0000-0000-000000000001'::uuid,
  '91000000-0000-0000-0000-000000000001'::uuid,
  'Established Loader',
  'CAT',
  '320',
  'SN-ONBOARD-001',
  'active',
  'Yard',
  CURRENT_DATE
);

SELECT is(
  (SELECT needs_onboarding
     FROM public.get_product_onboarding_status('91000000-0000-0000-0000-000000000001'::uuid)),
  false,
  'Owner with teams and equipment bypasses onboarding when completed_at is null'
);

DELETE FROM public.equipment
WHERE id = '93000000-0000-0000-0000-000000000001'::uuid;

-- Owner, teams only → still needs onboarding
SELECT is(
  (SELECT needs_onboarding
     FROM public.get_product_onboarding_status('91000000-0000-0000-0000-000000000001'::uuid)),
  true,
  'Owner with teams only still needs onboarding'
);

-- Member, empty org → no onboarding
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000002', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '12000000-0000-0000-0000-000000000002')::text,
  true
);

SELECT results_eq(
  $$SELECT needs_onboarding, is_org_admin
      FROM public.get_product_onboarding_status('91000000-0000-0000-0000-000000000001'::uuid)$$,
  $$VALUES (false, false)$$,
  'Member never needs onboarding'
);

-- Personal org owner who signed up via invitation skips onboarding checklist
INSERT INTO public.personal_organizations (user_id, organization_id)
VALUES (
  '12000000-0000-0000-0000-000000000001'::uuid,
  '91000000-0000-0000-0000-000000000001'::uuid
)
ON CONFLICT (user_id) DO UPDATE
  SET organization_id = EXCLUDED.organization_id;

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"signup_source":"invite"}'::jsonb
WHERE id = '12000000-0000-0000-0000-000000000001'::uuid;

INSERT INTO public.organization_invitations (
  id,
  organization_id,
  email,
  role,
  invited_by,
  status,
  invitation_token,
  expires_at,
  created_at,
  updated_at
) VALUES (
  '12000000-0000-0000-0000-000000000099'::uuid,
  '91000000-0000-0000-0000-000000000002'::uuid,
  'pgtap-onboarding-owner@equipqr.test',
  'member',
  '12000000-0000-0000-0000-000000000002'::uuid,
  'pending',
  '12000000-0000-0000-0000-000000000098'::uuid,
  NOW() + INTERVAL '7 days',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
  SET status = 'pending',
      expires_at = EXCLUDED.expires_at;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000001', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '12000000-0000-0000-0000-000000000001')::text,
  true
);

SELECT is(
  (SELECT needs_onboarding
     FROM public.get_product_onboarding_status('91000000-0000-0000-0000-000000000001'::uuid)),
  false,
  'Invited signup owner skips onboarding on personal org'
);

SELECT * FROM finish();
ROLLBACK;
