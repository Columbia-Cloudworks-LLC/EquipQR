BEGIN;
SELECT plan(6);

SELECT has_function(
  'public',
  'convert_work_order_to_historical',
  ARRAY['uuid', 'jsonb', 'boolean'],
  'convert_work_order_to_historical exists'
);

CREATE TEMP TABLE convert_test_context (
  label text PRIMARY KEY,
  id uuid NOT NULL
);

GRANT SELECT ON TABLE convert_test_context TO authenticated;

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
    '13000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'convert-admin@equipqr.test',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Convert Admin"}'::jsonb,
    false, 'authenticated', 'authenticated', '', '', '', ''
  ),
  (
    '13000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'convert-member@equipqr.test',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Convert Member"}'::jsonb,
    false, 'authenticated', 'authenticated', '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, name)
VALUES ('91000000-0000-0000-0000-000000000001'::uuid, 'Convert Historical Org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, name)
VALUES
  ('13000000-0000-0000-0000-000000000001'::uuid, 'convert-admin@equipqr.test', 'Convert Admin'),
  ('13000000-0000-0000-0000-000000000002'::uuid, 'convert-member@equipqr.test', 'Convert Member')
ON CONFLICT (id) DO NOTHING;

INSERT INTO convert_test_context (label, id)
VALUES ('org', '91000000-0000-0000-0000-000000000001'::uuid);

INSERT INTO public.organization_members (organization_id, user_id, role, status)
VALUES
  ((SELECT id FROM convert_test_context WHERE label = 'org'), '13000000-0000-0000-0000-000000000001'::uuid, 'owner', 'active'),
  ((SELECT id FROM convert_test_context WHERE label = 'org'), '13000000-0000-0000-0000-000000000002'::uuid, 'member', 'active');

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
  (SELECT id FROM convert_test_context WHERE label = 'org'),
  'Convert Forklift',
  'Toyota',
  '8FGCU25',
  'SN-CONVERT-001',
  'active',
  'Warehouse B',
  CURRENT_DATE
);

INSERT INTO public.work_orders (
  id,
  organization_id,
  equipment_id,
  title,
  description,
  created_by,
  status,
  priority,
  is_historical,
  created_date,
  completed_date,
  assignee_id
) VALUES (
  '31000000-0000-0000-0000-000000000001'::uuid,
  (SELECT id FROM convert_test_context WHERE label = 'org'),
  '21000000-0000-0000-0000-000000000001'::uuid,
  'Completed Operational WO',
  'Needs backdated customer documentation',
  '13000000-0000-0000-0000-000000000001'::uuid,
  'completed',
  'medium',
  false,
  TIMESTAMPTZ '2026-06-20T12:00:00Z',
  TIMESTAMPTZ '2026-06-21T16:00:00Z',
  '13000000-0000-0000-0000-000000000001'::uuid
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '13000000-0000-0000-0000-000000000002', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '13000000-0000-0000-0000-000000000002')::text,
  true
);

SELECT is(
  (public.convert_work_order_to_historical(
    '31000000-0000-0000-0000-000000000001'::uuid,
    public.synthesize_historical_timeline_events(
      TIMESTAMPTZ '2024-01-01T08:00:00Z',
      TIMESTAMPTZ '2024-01-05T16:00:00Z',
      'completed'::public.work_order_status,
      NULL
    ),
    false
  ) ->> 'success'),
  'false',
  'Org member cannot convert work order to historical'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '13000000-0000-0000-0000-000000000001', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '13000000-0000-0000-0000-000000000001')::text,
  true
);

SELECT is(
  (public.convert_work_order_to_historical(
    '31000000-0000-0000-0000-000000000001'::uuid,
    public.synthesize_historical_timeline_events(
      TIMESTAMPTZ '2024-01-01T08:00:00Z',
      TIMESTAMPTZ '2024-01-05T16:00:00Z',
      'completed'::public.work_order_status,
      '13000000-0000-0000-0000-000000000001'::uuid
    ),
    true
  ) ->> 'success'),
  'true',
  'Org admin can convert existing work order to historical'
);

SELECT is(
  (SELECT is_historical FROM public.work_orders WHERE id = '31000000-0000-0000-0000-000000000001'::uuid),
  true,
  'Converted work order is marked historical'
);

SELECT is(
  (SELECT created_date FROM public.work_orders WHERE id = '31000000-0000-0000-0000-000000000001'::uuid),
  TIMESTAMPTZ '2024-01-01T08:00:00Z',
  'Converted work order created_date follows backdated timeline'
);

SELECT is(
  (SELECT completed_date FROM public.work_orders WHERE id = '31000000-0000-0000-0000-000000000001'::uuid),
  TIMESTAMPTZ '2024-01-05T16:00:00Z',
  'Converted work order completed_date follows backdated timeline'
);

SELECT * FROM finish();
ROLLBACK;
