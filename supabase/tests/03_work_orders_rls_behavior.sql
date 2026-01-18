BEGIN;
SELECT plan(9);

CREATE TEMP TABLE test_context (
  label text PRIMARY KEY,
  id uuid NOT NULL
);

GRANT SELECT ON TABLE test_context TO authenticated;

-- Users (auth.users triggers profile + org creation)
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
  '10000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'pgtap-admin@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "pgTAP Admin"}'::jsonb,
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
  '10000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'pgtap-member@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "pgTAP Member"}'::jsonb,
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
  '10000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'pgtap-outsider@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "pgTAP Outsider"}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Organization + profiles
INSERT INTO public.organizations (id, name)
VALUES ('90000000-0000-0000-0000-000000000001'::uuid, 'pgTAP Work Orders Org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, name)
VALUES
  ('10000000-0000-0000-0000-000000000001'::uuid, 'pgtap-admin@equipqr.test', 'pgTAP Admin'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'pgtap-member@equipqr.test', 'pgTAP Member'),
  ('10000000-0000-0000-0000-000000000003'::uuid, 'pgtap-outsider@equipqr.test', 'pgTAP Outsider')
ON CONFLICT (id) DO NOTHING;

-- Register org context
INSERT INTO test_context (label, id)
VALUES ('org_admin', '90000000-0000-0000-0000-000000000001'::uuid);

-- Add admin + member to org
INSERT INTO public.organization_members (organization_id, user_id, role, status)
VALUES
  ((SELECT id FROM test_context WHERE label = 'org_admin'), '10000000-0000-0000-0000-000000000001'::uuid, 'owner', 'active'),
  ((SELECT id FROM test_context WHERE label = 'org_admin'), '10000000-0000-0000-0000-000000000002'::uuid, 'member', 'active');

-- Equipment fixture
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
  '20000000-0000-0000-0000-000000000001'::uuid,
  (SELECT id FROM test_context WHERE label = 'org_admin'),
  'Forklift A',
  'Toyota',
  '8FGCU25',
  'SN-TEST-001',
  'active',
  'Warehouse A',
  CURRENT_DATE
);

-- Baseline work order in org_admin
INSERT INTO public.work_orders (
  id,
  organization_id,
  equipment_id,
  title,
  description,
  created_by,
  status,
  priority,
  is_historical
) VALUES (
  '30000000-0000-0000-0000-000000000001'::uuid,
  (SELECT id FROM test_context WHERE label = 'org_admin'),
  '20000000-0000-0000-0000-000000000001'::uuid,
  'Initial Work Order',
  'Initial description',
  '10000000-0000-0000-0000-000000000001'::uuid,
  'submitted',
  'medium',
  false
);

-- Member context
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '10000000-0000-0000-0000-000000000002')::text, true);
SELECT is(auth.uid(), '10000000-0000-0000-0000-000000000002'::uuid, 'auth.uid set for member');

SELECT is(
  (SELECT count(*)::int FROM public.work_orders WHERE organization_id = (SELECT id FROM test_context WHERE label = 'org_admin')),
  1,
  'Org member can select work orders'
);

SELECT lives_ok($$
  INSERT INTO public.work_orders (
    id,
    organization_id,
    equipment_id,
    title,
    description,
    created_by,
    status,
    priority,
    is_historical
  ) VALUES (
    '30000000-0000-0000-0000-000000000002'::uuid,
    (SELECT id FROM test_context WHERE label = 'org_admin'),
    '20000000-0000-0000-0000-000000000001'::uuid,
    'Member Work Order',
    'Member created work order',
    '10000000-0000-0000-0000-000000000002'::uuid,
    'submitted',
    'medium',
    false
  );
$$, 'Member can insert non-historical work order');

SELECT lives_ok($$
  INSERT INTO public.work_orders (
    id,
    organization_id,
    equipment_id,
    title,
    description,
    created_by,
    created_by_admin,
    status,
    priority,
    is_historical
  ) VALUES (
    '30000000-0000-0000-0000-000000000003'::uuid,
    (SELECT id FROM test_context WHERE label = 'org_admin'),
    '20000000-0000-0000-0000-000000000001'::uuid,
    'Historical Work Order',
    'Member created historical work order',
    '10000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid,
    'submitted',
    'medium',
    true
  );
$$, 'Member can insert historical work order');

-- Admin context
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '10000000-0000-0000-0000-000000000001')::text, true);
SELECT is(auth.uid(), '10000000-0000-0000-0000-000000000001'::uuid, 'auth.uid set for admin');

SELECT lives_ok($$
  INSERT INTO public.work_orders (
    id,
    organization_id,
    equipment_id,
    title,
    description,
    created_by,
    created_by_admin,
    status,
    priority,
    is_historical
  ) VALUES (
    '30000000-0000-0000-0000-000000000004'::uuid,
    (SELECT id FROM test_context WHERE label = 'org_admin'),
    '20000000-0000-0000-0000-000000000001'::uuid,
    'Historical Work Order Admin',
    'Admin created historical work order',
    '10000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    'submitted',
    'medium',
    true
  );
$$, 'Admin can insert historical work order');

-- Outsider context
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '10000000-0000-0000-0000-000000000003')::text, true);
SELECT is(auth.uid(), '10000000-0000-0000-0000-000000000003'::uuid, 'auth.uid set for outsider');

SELECT is(
  (SELECT count(*)::int FROM public.work_orders WHERE organization_id = (SELECT id FROM test_context WHERE label = 'org_admin')),
  0,
  'Non-member cannot select work orders'
);

SELECT throws_ok($$
  INSERT INTO public.work_orders (
    id,
    organization_id,
    equipment_id,
    title,
    description,
    created_by,
    status,
    priority,
    is_historical
  ) VALUES (
    '30000000-0000-0000-0000-000000000005'::uuid,
    (SELECT id FROM test_context WHERE label = 'org_admin'),
    '20000000-0000-0000-0000-000000000001'::uuid,
    'Outsider Work Order',
    'Outsider work order',
    '10000000-0000-0000-0000-000000000003'::uuid,
    'submitted',
    'medium',
    false
  );
$$, '42501');

SELECT * FROM finish();
ROLLBACK;
