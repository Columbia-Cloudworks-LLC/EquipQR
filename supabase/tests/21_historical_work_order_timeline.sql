BEGIN;
SELECT plan(8);

SELECT has_function(
  'public',
  'replace_historical_work_order_timeline',
  ARRAY['uuid', 'uuid', 'jsonb', 'boolean'],
  'replace_historical_work_order_timeline exists'
);

SELECT has_function(
  'public',
  'synthesize_historical_timeline_events',
  ARRAY['timestamp with time zone', 'timestamp with time zone', 'work_order_status', 'uuid'],
  'synthesize_historical_timeline_events exists'
);

SELECT is(
  public.historical_timeline_allowed_next_statuses('submitted'::public.work_order_status),
  ARRAY['accepted', 'cancelled']::public.work_order_status[],
  'submitted allows accepted or cancelled'
);

SELECT is(
  public.historical_timeline_allowed_next_statuses('accepted'::public.work_order_status),
  ARRAY['assigned', 'cancelled']::public.work_order_status[],
  'accepted allows assigned or cancelled'
);

SELECT is(
  jsonb_array_length(
    public.synthesize_historical_timeline_events(
      TIMESTAMPTZ '2024-01-01T08:00:00Z',
      TIMESTAMPTZ '2024-01-05T16:00:00Z',
      'completed'::public.work_order_status,
      '10000000-0000-0000-0000-000000000099'::uuid
    )
  ),
  5,
  'completed status synthesizes five timeline events'
);

SELECT is(
  (public.synthesize_historical_timeline_events(
    TIMESTAMPTZ '2024-01-01T08:00:00Z',
    TIMESTAMPTZ '2024-01-05T16:00:00Z',
    'completed'::public.work_order_status,
    '10000000-0000-0000-0000-000000000099'::uuid
  ) -> 0 ->> 'new_status'),
  'submitted',
  'synthesized timeline begins with submitted'
);

-- #1279: replace RPC must reject non-submitted first events (cursed accepted-first shape)
CREATE TEMP TABLE cursed_timeline_rpc_context (
  label text PRIMARY KEY,
  id uuid NOT NULL
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
  '14000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'cursed-timeline-admin@equipqr.test',
  extensions.crypt(('pgtap-fixture-' || '14000000-0000-0000-0000-000000000001'::uuid::text), extensions.gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "Cursed Timeline Admin"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, name)
VALUES ('92000000-0000-0000-0000-000000000001'::uuid, 'Cursed Timeline RPC Org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, name)
VALUES (
  '14000000-0000-0000-0000-000000000001'::uuid,
  'cursed-timeline-admin@equipqr.test',
  'Cursed Timeline Admin'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO cursed_timeline_rpc_context (label, id)
VALUES ('org', '92000000-0000-0000-0000-000000000001'::uuid);

INSERT INTO public.organization_members (organization_id, user_id, role, status)
VALUES (
  (SELECT id FROM cursed_timeline_rpc_context WHERE label = 'org'),
  '14000000-0000-0000-0000-000000000001'::uuid,
  'owner',
  'active'
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
  '22000000-0000-0000-0000-000000000001'::uuid,
  (SELECT id FROM cursed_timeline_rpc_context WHERE label = 'org'),
  'Cursed RPC Excavator',
  'AnonEquip',
  'AE-100',
  'SN-CURSED-RPC-001',
  'active',
  'Yard A',
  CURRENT_DATE
);

INSERT INTO public.work_orders (
  id,
  organization_id,
  equipment_id,
  title,
  description,
  priority,
  status,
  created_by,
  created_date,
  is_historical,
  historical_start_date
) VALUES (
  '23000000-0000-0000-0000-000000000001'::uuid,
  (SELECT id FROM cursed_timeline_rpc_context WHERE label = 'org'),
  '22000000-0000-0000-0000-000000000001'::uuid,
  'Cursed RPC Accepted First',
  'pgTAP fixture for replace rejection of accepted-first payload',
  'medium',
  'accepted',
  '14000000-0000-0000-0000-000000000001'::uuid,
  TIMESTAMPTZ '2026-03-24T13:00:00Z',
  true,
  TIMESTAMPTZ '2026-03-24T13:00:00Z'
);

SELECT set_config('request.jwt.claim.sub', '14000000-0000-0000-0000-000000000001', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '14000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true
);

SELECT is(
  (
    public.replace_historical_work_order_timeline(
      '23000000-0000-0000-0000-000000000001'::uuid,
      (SELECT id FROM cursed_timeline_rpc_context WHERE label = 'org'),
      jsonb_build_array(
        jsonb_build_object(
          'old_status', NULL,
          'new_status', 'accepted',
          'changed_at', '2026-03-24T13:00:00Z',
          'reason', 'Historical work order created',
          'assignee_id', NULL
        )
      ),
      true
    ) ->> 'error'
  ),
  'Timeline must begin with submitted',
  'replace rejects cursed accepted-first timeline payload'
);

SELECT is(
  (
    public.replace_historical_work_order_timeline(
      '23000000-0000-0000-0000-000000000001'::uuid,
      (SELECT id FROM cursed_timeline_rpc_context WHERE label = 'org'),
      jsonb_build_array(
        jsonb_build_object(
          'old_status', NULL,
          'new_status', 'submitted',
          'changed_at', '2026-03-24T13:00:00Z',
          'reason', 'Historical status recorded',
          'assignee_id', NULL
        ),
        jsonb_build_object(
          'old_status', 'submitted',
          'new_status', 'accepted',
          'changed_at', '2026-03-24T14:00:00Z',
          'reason', 'Historical status recorded',
          'assignee_id', NULL
        )
      ),
      true
    ) ->> 'success'
  ),
  'true',
  'replace accepts submitted-first repaired timeline payload'
);

SELECT * FROM finish();
ROLLBACK;
