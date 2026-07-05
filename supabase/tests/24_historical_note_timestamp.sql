-- pgTAP: update_historical_work_order_note_timestamp (issue #1121)
BEGIN;
SELECT plan(6);

SELECT has_function(
  'public',
  'update_historical_work_order_note_timestamp',
  ARRAY['uuid', 'uuid', 'uuid', 'timestamp with time zone'],
  'update_historical_work_order_note_timestamp exists'
);

CREATE TEMP TABLE note_ts_test_context (
  label text PRIMARY KEY,
  id uuid NOT NULL
);

GRANT SELECT ON TABLE note_ts_test_context TO authenticated;

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
    '14000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'note-ts-admin@equipqr.test',
    extensions.crypt(('pgtap-fixture-' || '14000000-0000-0000-0000-000000000001'::uuid::text), extensions.gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Note TS Admin"}'::jsonb,
    false, 'authenticated', 'authenticated', '', '', '', ''
  ),
  (
    '14000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'note-ts-member@equipqr.test',
    extensions.crypt(('pgtap-fixture-' || '14000000-0000-0000-0000-000000000002'::uuid::text), extensions.gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Note TS Member"}'::jsonb,
    false, 'authenticated', 'authenticated', '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, name)
VALUES ('92000000-0000-0000-0000-000000000001'::uuid, 'Historical Note Timestamp Org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, name)
VALUES
  ('14000000-0000-0000-0000-000000000001'::uuid, 'note-ts-admin@equipqr.test', 'Note TS Admin'),
  ('14000000-0000-0000-0000-000000000002'::uuid, 'note-ts-member@equipqr.test', 'Note TS Member')
ON CONFLICT (id) DO NOTHING;

INSERT INTO note_ts_test_context (label, id)
VALUES ('org', '92000000-0000-0000-0000-000000000001'::uuid);

INSERT INTO public.organization_members (organization_id, user_id, role, status)
VALUES
  ((SELECT id FROM note_ts_test_context WHERE label = 'org'), '14000000-0000-0000-0000-000000000001'::uuid, 'owner', 'active'),
  ((SELECT id FROM note_ts_test_context WHERE label = 'org'), '14000000-0000-0000-0000-000000000002'::uuid, 'member', 'active');

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
  '22000000-0000-0000-0000-000000000001'::uuid,
  (SELECT id FROM note_ts_test_context WHERE label = 'org'),
  'Historical Forklift',
  'Toyota',
  '8FGCU25',
  'SN-NOTE-TS-001',
  'active',
  'Warehouse C',
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
  completed_date
) VALUES
  (
    '32000000-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM note_ts_test_context WHERE label = 'org'),
    '22000000-0000-0000-0000-000000000001'::uuid,
    'Historical WO With Note',
    'Backdated paperwork',
    '14000000-0000-0000-0000-000000000001'::uuid,
    'completed',
    'medium',
    true,
    TIMESTAMPTZ '2024-01-01T08:00:00Z',
    TIMESTAMPTZ '2024-01-05T16:00:00Z'
  ),
  (
    '32000000-0000-0000-0000-000000000002'::uuid,
    (SELECT id FROM note_ts_test_context WHERE label = 'org'),
    '22000000-0000-0000-0000-000000000001'::uuid,
    'Operational WO With Note',
    'Still active',
    '14000000-0000-0000-0000-000000000001'::uuid,
    'in_progress',
    'medium',
    false,
    TIMESTAMPTZ '2024-02-01T08:00:00Z',
    NULL
  );

INSERT INTO public.work_order_notes (
  id,
  work_order_id,
  author_id,
  content,
  hours_worked,
  is_private,
  created_at
) VALUES
  (
    '42000000-0000-0000-0000-000000000001'::uuid,
    '32000000-0000-0000-0000-000000000001'::uuid,
    '14000000-0000-0000-0000-000000000001'::uuid,
    'Historical note body',
    0,
    false,
    TIMESTAMPTZ '2024-01-02T10:00:00Z'
  ),
  (
    '42000000-0000-0000-0000-000000000002'::uuid,
    '32000000-0000-0000-0000-000000000002'::uuid,
    '14000000-0000-0000-0000-000000000001'::uuid,
    'Operational note body',
    0,
    false,
    TIMESTAMPTZ '2024-02-02T10:00:00Z'
  );

SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"14000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT is(
  (public.update_historical_work_order_note_timestamp(
    (SELECT id FROM note_ts_test_context WHERE label = 'org'),
    '32000000-0000-0000-0000-000000000001'::uuid,
    '42000000-0000-0000-0000-000000000001'::uuid,
    TIMESTAMPTZ '2024-01-03T12:00:00Z'
  ) ->> 'success'),
  'false',
  'non-admin cannot update historical note timestamps'
);

SET LOCAL request.jwt.claims = '{"sub":"14000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is(
  (public.update_historical_work_order_note_timestamp(
    (SELECT id FROM note_ts_test_context WHERE label = 'org'),
    '32000000-0000-0000-0000-000000000002'::uuid,
    '42000000-0000-0000-0000-000000000002'::uuid,
    TIMESTAMPTZ '2024-02-03T12:00:00Z'
  ) ->> 'error'),
  'Note timestamp editing is only allowed for historical work orders',
  'operational work orders reject note timestamp edits'
);

SELECT ok(
  (public.update_historical_work_order_note_timestamp(
    (SELECT id FROM note_ts_test_context WHERE label = 'org'),
    '32000000-0000-0000-0000-000000000001'::uuid,
    '42000000-0000-0000-0000-000000000001'::uuid,
    TIMESTAMPTZ '2024-01-03T12:00:00Z'
  ) ->> 'success')::boolean,
  'owner/admin can update historical note timestamps'
);

SELECT is(
  (SELECT created_at FROM public.work_order_notes WHERE id = '42000000-0000-0000-0000-000000000001'::uuid),
  TIMESTAMPTZ '2024-01-03T12:00:00Z',
  'note created_at is updated'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.audit_log
    WHERE entity_type = 'work_order'
      AND entity_id = '32000000-0000-0000-0000-000000000001'::uuid
      AND metadata ->> 'source' = 'historical_note_timestamp_editor'
      AND metadata ->> 'note_id' = '42000000-0000-0000-0000-000000000001'
  ),
  'note timestamp edit writes an audit log entry'
);

SELECT * FROM finish();
ROLLBACK;
