BEGIN;
SELECT plan(6);

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
  '11000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'pgtap-admin-pm@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "pgTAP Admin PM"}'::jsonb,
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
  'pgtap-member-pm@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "pgTAP Member PM"}'::jsonb,
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
  'pgtap-outsider-pm@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "pgTAP Outsider PM"}'::jsonb,
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
VALUES ('90000000-0000-0000-0000-000000000002'::uuid, 'pgTAP PM Org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, name)
VALUES
  ('11000000-0000-0000-0000-000000000001'::uuid, 'pgtap-admin-pm@equipqr.test', 'pgTAP Admin PM'),
  ('11000000-0000-0000-0000-000000000002'::uuid, 'pgtap-member-pm@equipqr.test', 'pgTAP Member PM'),
  ('11000000-0000-0000-0000-000000000003'::uuid, 'pgtap-outsider-pm@equipqr.test', 'pgTAP Outsider PM')
ON CONFLICT (id) DO NOTHING;

-- Register org context
INSERT INTO test_context (label, id)
VALUES ('org_admin', '90000000-0000-0000-0000-000000000002'::uuid);

-- Add admin + member to org
INSERT INTO public.organization_members (organization_id, user_id, role, status)
VALUES
  ((SELECT id FROM test_context WHERE label = 'org_admin'), '11000000-0000-0000-0000-000000000001'::uuid, 'owner', 'active'),
  ((SELECT id FROM test_context WHERE label = 'org_admin'), '11000000-0000-0000-0000-000000000002'::uuid, 'member', 'active');

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
  '21000000-0000-0000-0000-000000000001'::uuid,
  (SELECT id FROM test_context WHERE label = 'org_admin'),
  'Loader B',
  'CAT',
  '320D',
  'SN-TEST-101',
  'active',
  'Yard B',
  CURRENT_DATE
);

-- Work order fixture
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
  '31000000-0000-0000-0000-000000000001'::uuid,
  (SELECT id FROM test_context WHERE label = 'org_admin'),
  '21000000-0000-0000-0000-000000000001'::uuid,
  'PM Work Order',
  'PM work order for equipment',
  '11000000-0000-0000-0000-000000000001'::uuid,
  'submitted',
  'medium',
  false
);

-- PM template fixture (protected)
INSERT INTO public.pm_checklist_templates (
  id,
  organization_id,
  name,
  description,
  is_protected,
  template_data,
  created_by
) VALUES (
  '22000000-0000-0000-0000-000000000001'::uuid,
  (SELECT id FROM test_context WHERE label = 'org_admin'),
  'Protected Template',
  'Protected PM template',
  true,
  $$[{"label":"Check oil","required":true}]$$::jsonb,
  '11000000-0000-0000-0000-000000000001'::uuid
);

-- PM record fixture
INSERT INTO public.preventative_maintenance (
  id,
  work_order_id,
  equipment_id,
  organization_id,
  created_by,
  status,
  checklist_data,
  template_id
) VALUES (
  '23000000-0000-0000-0000-000000000001'::uuid,
  '31000000-0000-0000-0000-000000000001'::uuid,
  '21000000-0000-0000-0000-000000000001'::uuid,
  (SELECT id FROM test_context WHERE label = 'org_admin'),
  '11000000-0000-0000-0000-000000000001'::uuid,
  'pending',
  '[]'::jsonb,
  '22000000-0000-0000-0000-000000000001'::uuid
);

-- Member context
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000002', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '11000000-0000-0000-0000-000000000002')::text, true);
SELECT is(auth.uid(), '11000000-0000-0000-0000-000000000002'::uuid, 'auth.uid set for member');

SELECT is(
  (SELECT count(*)::int FROM public.preventative_maintenance WHERE organization_id = (SELECT id FROM test_context WHERE label = 'org_admin')),
  1,
  'Org member can select PM records'
);

-- Outsider context
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000003', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '11000000-0000-0000-0000-000000000003')::text, true);
SELECT is(auth.uid(), '11000000-0000-0000-0000-000000000003'::uuid, 'auth.uid set for outsider');

SELECT is(
  (SELECT count(*)::int FROM public.preventative_maintenance WHERE organization_id = (SELECT id FROM test_context WHERE label = 'org_admin')),
  0,
  'Non-member cannot select PM records'
);

-- Admin context: protected template should not be deletable
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '11000000-0000-0000-0000-000000000001')::text, true);
SELECT is(auth.uid(), '11000000-0000-0000-0000-000000000001'::uuid, 'auth.uid set for admin');

DELETE FROM public.pm_checklist_templates
WHERE id = '22000000-0000-0000-0000-000000000001'::uuid;

SELECT is(
  (SELECT count(*)::int FROM public.pm_checklist_templates WHERE id = '22000000-0000-0000-0000-000000000001'::uuid),
  1,
  'Protected PM template cannot be deleted'
);

SELECT * FROM finish();
ROLLBACK;
