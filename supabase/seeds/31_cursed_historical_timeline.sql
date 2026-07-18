-- =====================================================
-- CURSED_HISTORICAL_FIXTURE — historical timeline edge cases (#1279)
-- =====================================================
-- Provenance: anonymized reconstructions of legacy production shapes that
-- caused #1276 (first history row = accepted + reason "Historical work order
-- created", missing leading submitted). Intentionally preserve the *pre-repair*
-- shape so load-time normalize + replace RPC rejection stay permanently covered.
--
-- Seeds run AFTER migrations, so the one-shot #1276 backfill does not rewrite
-- these rows. Do not "fix" them to submitted-first in this file.
--
-- Variants:
--   c01 — single-event accepted-first stub (exact #1276 deadlock shape)
--   c02 — multi-event legacy: accepted → assigned → in_progress
--   c03 — long in_progress chain (legacy accepted start + later transitions)
--   c04 — happy-path contrast: modern submitted-first completed timeline
--   c05 — boundary: assigned history row missing assignee_id (metadata flag)
--   c06 — boundary: out-of-order timestamps (later event earlier changed_at)
-- =====================================================

-- Dedicated owner (personal org for cursed fixture)
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
  'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'owner@cursedtimeline.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Casey Cursed"}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, name, created_at, updated_at)
VALUES (
  'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
  'owner@cursedtimeline.test',
  'Casey Cursed',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = EXCLUDED.name;

INSERT INTO public.organizations (
  id,
  name,
  plan,
  member_count,
  max_members,
  features,
  created_at,
  updated_at
) VALUES (
  '660e8400-e29b-41d4-a716-446655440011'::uuid,
  'CURSED_HISTORICAL_FIXTURE Timeline Lab',
  'premium'::public.organization_plan,
  2,
  50,
  ARRAY['Equipment Management', 'Work Orders', 'Team Management'],
  '2024-06-01 00:00:00+00',
  '2024-06-01 00:00:00+00'
)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name;

INSERT INTO public.organization_members (
  id,
  organization_id,
  user_id,
  role,
  status,
  joined_date,
  product_onboarding_completed_at
) VALUES
  (
    'cc0e8400-e29b-41d4-a716-4466554400a1'::uuid,
    '660e8400-e29b-41d4-a716-446655440011'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    'owner',
    'active',
    '2024-06-01 00:00:00+00',
    '2024-06-01 00:00:00+00'
  ),
  -- Apex owner as admin so default e2e persona can pin this org
  (
    'cc0e8400-e29b-41d4-a716-4466554400a2'::uuid,
    '660e8400-e29b-41d4-a716-446655440011'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    'admin',
    'active',
    '2024-06-01 00:00:00+00',
    '2024-06-01 00:00:00+00'
  )
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role,
      status = EXCLUDED.status,
      product_onboarding_completed_at = EXCLUDED.product_onboarding_completed_at;

INSERT INTO public.personal_organizations (user_id, organization_id)
VALUES (
  'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
  '660e8400-e29b-41d4-a716-446655440011'::uuid
)
ON CONFLICT DO NOTHING;

INSERT INTO public.teams (
  id,
  organization_id,
  name,
  description,
  location_address,
  location_city,
  location_state,
  location_country,
  location_lat,
  location_lng,
  override_equipment_location,
  created_at,
  updated_at
) VALUES (
  '880e8400-e29b-41d4-a716-446655440011'::uuid,
  '660e8400-e29b-41d4-a716-446655440011'::uuid,
  'Cursed Yard Crew',
  'Fixture team for historical timeline cursed seeds',
  NULL,
  'Springfield',
  'IL',
  'United States',
  39.781721,
  -89.650148,
  false,
  '2024-06-01 00:00:00+00',
  '2024-06-01 00:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.team_members (id, team_id, user_id, role, joined_date)
VALUES
  (
    '990e8400-e29b-41d4-a716-4466554400a1'::uuid,
    '880e8400-e29b-41d4-a716-446655440011'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    'manager',
    '2024-06-01 00:00:00+00'
  ),
  (
    '990e8400-e29b-41d4-a716-4466554400a2'::uuid,
    '880e8400-e29b-41d4-a716-446655440011'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    'technician',
    '2024-06-01 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.equipment (
  id,
  organization_id,
  team_id,
  name,
  manufacturer,
  model,
  serial_number,
  status,
  location,
  installation_date,
  working_hours,
  custom_attributes,
  last_known_location,
  created_at,
  updated_at
) VALUES (
  'aa0e8400-e29b-41d4-a716-446655440c01'::uuid,
  '660e8400-e29b-41d4-a716-446655440011'::uuid,
  '880e8400-e29b-41d4-a716-446655440011'::uuid,
  'Fixture Excavator Alpha',
  'AnonEquip',
  'AE-320',
  'CURSED-EX-0001',
  'active'::equipment_status,
  'Springfield, IL',
  '2023-05-01',
  1250.0,
  '{"year": "2023", "fixture": "cursed_historical"}'::jsonb,
  NULL,
  '2024-06-01 00:00:00+00',
  '2024-06-01 00:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

-- Reset cursed work orders + history for idempotent re-seed
DELETE FROM public.work_order_status_history
WHERE work_order_id IN (
  'a00e8400-e29b-41d4-a716-446655440c01'::uuid,
  'a00e8400-e29b-41d4-a716-446655440c02'::uuid,
  'a00e8400-e29b-41d4-a716-446655440c03'::uuid,
  'a00e8400-e29b-41d4-a716-446655440c04'::uuid,
  'a00e8400-e29b-41d4-a716-446655440c05'::uuid,
  'a00e8400-e29b-41d4-a716-446655440c06'::uuid
);

DELETE FROM public.work_orders
WHERE id IN (
  'a00e8400-e29b-41d4-a716-446655440c01'::uuid,
  'a00e8400-e29b-41d4-a716-446655440c02'::uuid,
  'a00e8400-e29b-41d4-a716-446655440c03'::uuid,
  'a00e8400-e29b-41d4-a716-446655440c04'::uuid,
  'a00e8400-e29b-41d4-a716-446655440c05'::uuid,
  'a00e8400-e29b-41d4-a716-446655440c06'::uuid
);

INSERT INTO public.work_orders (
  id,
  organization_id,
  equipment_id,
  title,
  description,
  status,
  priority,
  assignee_id,
  assignee_name,
  team_id,
  created_by,
  created_by_name,
  created_date,
  due_date,
  completed_date,
  is_historical,
  historical_start_date,
  has_pm,
  updated_at
) VALUES
  -- c01: single-event accepted-first stub
  (
    'a00e8400-e29b-41d4-a716-446655440c01'::uuid,
    '660e8400-e29b-41d4-a716-446655440011'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440c01'::uuid,
    'Cursed Legacy Accepted Stub',
    'Anonymized legacy historical create: first history row accepted only.',
    'accepted',
    'medium',
    NULL,
    NULL,
    '880e8400-e29b-41d4-a716-446655440011'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    'Casey Cursed',
    '2026-03-24T13:00:00.000Z',
    NULL,
    NULL,
    true,
    '2026-03-24T13:00:00.000Z',
    false,
    '2026-03-24T13:00:00.000Z'
  ),
  -- c02: multi-event legacy ending in_progress
  (
    'a00e8400-e29b-41d4-a716-446655440c02'::uuid,
    '660e8400-e29b-41d4-a716-446655440011'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440c01'::uuid,
    'Cursed Legacy Multi-Event In Progress',
    'Legacy accepted-first stub plus later assigned/in_progress transitions.',
    'in_progress',
    'high',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    'Alex Apex',
    '880e8400-e29b-41d4-a716-446655440011'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    'Casey Cursed',
    '2026-02-10T09:00:00.000Z',
    NULL,
    NULL,
    true,
    '2026-02-10T09:00:00.000Z',
    false,
    '2026-02-12T15:30:00.000Z'
  ),
  -- c03: long in_progress chain (mirrors long-lived customer edit case)
  (
    'a00e8400-e29b-41d4-a716-446655440c03'::uuid,
    '660e8400-e29b-41d4-a716-446655440011'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440c01'::uuid,
    'Cursed Long In-Progress Chain',
    'Long legacy chain starting at accepted; currently in_progress.',
    'in_progress',
    'medium',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    'Alex Apex',
    '880e8400-e29b-41d4-a716-446655440011'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    'Casey Cursed',
    '2025-11-01T08:00:00.000Z',
    NULL,
    NULL,
    true,
    '2025-11-01T08:00:00.000Z',
    false,
    '2026-01-20T16:00:00.000Z'
  ),
  -- c04: happy-path submitted-first completed
  (
    'a00e8400-e29b-41d4-a716-446655440c04'::uuid,
    '660e8400-e29b-41d4-a716-446655440011'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440c01'::uuid,
    'Cursed Happy Path Submitted First',
    'Contrast record created via modern synthesize path (starts with submitted).',
    'completed',
    'low',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    'Alex Apex',
    '880e8400-e29b-41d4-a716-446655440011'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    'Casey Cursed',
    '2026-01-05T08:00:00.000Z',
    NULL,
    '2026-01-09T17:00:00.000Z',
    true,
    '2026-01-05T08:00:00.000Z',
    false,
    '2026-01-09T17:00:00.000Z'
  ),
  -- c05: boundary — assigned without assignee on history metadata
  (
    'a00e8400-e29b-41d4-a716-446655440c05'::uuid,
    '660e8400-e29b-41d4-a716-446655440011'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440c01'::uuid,
    'Cursed Boundary Missing Assignee',
    'Structural boundary: assigned transition recorded without assignee_id.',
    'assigned',
    'medium',
    NULL,
    NULL,
    '880e8400-e29b-41d4-a716-446655440011'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    'Casey Cursed',
    '2026-04-01T10:00:00.000Z',
    NULL,
    NULL,
    true,
    '2026-04-01T10:00:00.000Z',
    false,
    '2026-04-02T11:00:00.000Z'
  ),
  -- c06: boundary — out-of-order timestamps
  (
    'a00e8400-e29b-41d4-a716-446655440c06'::uuid,
    '660e8400-e29b-41d4-a716-446655440011'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440c01'::uuid,
    'Cursed Boundary Out-Of-Order Timestamps',
    'Structural boundary: later status has earlier changed_at than previous.',
    'accepted',
    'low',
    NULL,
    NULL,
    '880e8400-e29b-41d4-a716-446655440011'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    'Casey Cursed',
    '2026-05-01T12:00:00.000Z',
    NULL,
    NULL,
    true,
    '2026-05-01T12:00:00.000Z',
    false,
    '2026-05-01T12:00:00.000Z'
  );

INSERT INTO public.work_order_status_history (
  id,
  work_order_id,
  old_status,
  new_status,
  changed_by,
  changed_at,
  reason,
  is_historical_creation,
  metadata,
  changed_by_name
) VALUES
  -- c01
  (
    'b10e8400-e29b-41d4-a716-446655440c01'::uuid,
    'a00e8400-e29b-41d4-a716-446655440c01'::uuid,
    NULL,
    'accepted',
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    '2026-03-24T13:00:00.000Z',
    'Historical work order created',
    true,
    '{"fixture":"cursed_historical_c01","issue":1279}'::jsonb,
    'Casey Cursed'
  ),
  -- c02
  (
    'b10e8400-e29b-41d4-a716-446655440c20'::uuid,
    'a00e8400-e29b-41d4-a716-446655440c02'::uuid,
    NULL,
    'accepted',
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    '2026-02-10T09:00:00.000Z',
    'Historical work order created',
    true,
    '{"fixture":"cursed_historical_c02","issue":1279}'::jsonb,
    'Casey Cursed'
  ),
  (
    'b10e8400-e29b-41d4-a716-446655440c21'::uuid,
    'a00e8400-e29b-41d4-a716-446655440c02'::uuid,
    'accepted',
    'assigned',
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    '2026-02-11T10:00:00.000Z',
    'Assigned technician',
    false,
    '{"fixture":"cursed_historical_c02","assignee_id":"bb0e8400-e29b-41d4-a716-446655440001"}'::jsonb,
    'Casey Cursed'
  ),
  (
    'b10e8400-e29b-41d4-a716-446655440c22'::uuid,
    'a00e8400-e29b-41d4-a716-446655440c02'::uuid,
    'assigned',
    'in_progress',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2026-02-12T15:30:00.000Z',
    'Work started',
    false,
    '{"fixture":"cursed_historical_c02"}'::jsonb,
    'Alex Apex'
  ),
  -- c03 long chain
  (
    'b10e8400-e29b-41d4-a716-446655440c30'::uuid,
    'a00e8400-e29b-41d4-a716-446655440c03'::uuid,
    NULL,
    'accepted',
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    '2025-11-01T08:00:00.000Z',
    'Historical work order created',
    true,
    '{"fixture":"cursed_historical_c03","issue":1279}'::jsonb,
    'Casey Cursed'
  ),
  (
    'b10e8400-e29b-41d4-a716-446655440c31'::uuid,
    'a00e8400-e29b-41d4-a716-446655440c03'::uuid,
    'accepted',
    'assigned',
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    '2025-11-03T09:00:00.000Z',
    'Assigned field tech',
    false,
    '{"fixture":"cursed_historical_c03","assignee_id":"bb0e8400-e29b-41d4-a716-446655440001"}'::jsonb,
    'Casey Cursed'
  ),
  (
    'b10e8400-e29b-41d4-a716-446655440c32'::uuid,
    'a00e8400-e29b-41d4-a716-446655440c03'::uuid,
    'assigned',
    'in_progress',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2025-11-04T14:00:00.000Z',
    'Diagnosis started',
    false,
    '{"fixture":"cursed_historical_c03"}'::jsonb,
    'Alex Apex'
  ),
  (
    'b10e8400-e29b-41d4-a716-446655440c33'::uuid,
    'a00e8400-e29b-41d4-a716-446655440c03'::uuid,
    'in_progress',
    'on_hold',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2025-12-01T11:00:00.000Z',
    'Waiting on parts',
    false,
    '{"fixture":"cursed_historical_c03"}'::jsonb,
    'Alex Apex'
  ),
  (
    'b10e8400-e29b-41d4-a716-446655440c34'::uuid,
    'a00e8400-e29b-41d4-a716-446655440c03'::uuid,
    'on_hold',
    'in_progress',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2026-01-20T16:00:00.000Z',
    'Parts arrived; resumed',
    false,
    '{"fixture":"cursed_historical_c03"}'::jsonb,
    'Alex Apex'
  ),
  -- c04 happy path
  (
    'b10e8400-e29b-41d4-a716-446655440c40'::uuid,
    'a00e8400-e29b-41d4-a716-446655440c04'::uuid,
    NULL,
    'submitted',
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    '2026-01-05T08:00:00.000Z',
    'Historical status recorded',
    true,
    '{"fixture":"cursed_historical_c04","issue":1279}'::jsonb,
    'Casey Cursed'
  ),
  (
    'b10e8400-e29b-41d4-a716-446655440c41'::uuid,
    'a00e8400-e29b-41d4-a716-446655440c04'::uuid,
    'submitted',
    'accepted',
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    '2026-01-06T09:00:00.000Z',
    'Historical status recorded',
    false,
    '{"fixture":"cursed_historical_c04"}'::jsonb,
    'Casey Cursed'
  ),
  (
    'b10e8400-e29b-41d4-a716-446655440c42'::uuid,
    'a00e8400-e29b-41d4-a716-446655440c04'::uuid,
    'accepted',
    'assigned',
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    '2026-01-07T10:00:00.000Z',
    'Historical status recorded',
    false,
    '{"fixture":"cursed_historical_c04","assignee_id":"bb0e8400-e29b-41d4-a716-446655440001"}'::jsonb,
    'Casey Cursed'
  ),
  (
    'b10e8400-e29b-41d4-a716-446655440c43'::uuid,
    'a00e8400-e29b-41d4-a716-446655440c04'::uuid,
    'assigned',
    'in_progress',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2026-01-08T11:00:00.000Z',
    'Historical status recorded',
    false,
    '{"fixture":"cursed_historical_c04"}'::jsonb,
    'Alex Apex'
  ),
  (
    'b10e8400-e29b-41d4-a716-446655440c44'::uuid,
    'a00e8400-e29b-41d4-a716-446655440c04'::uuid,
    'in_progress',
    'completed',
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2026-01-09T17:00:00.000Z',
    'Historical status recorded',
    false,
    '{"fixture":"cursed_historical_c04"}'::jsonb,
    'Alex Apex'
  ),
  -- c05: submitted→accepted→assigned (assigned missing assignee in metadata)
  (
    'b10e8400-e29b-41d4-a716-446655440c50'::uuid,
    'a00e8400-e29b-41d4-a716-446655440c05'::uuid,
    NULL,
    'submitted',
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    '2026-04-01T10:00:00.000Z',
    'Historical status recorded',
    true,
    '{"fixture":"cursed_historical_c05","issue":1279}'::jsonb,
    'Casey Cursed'
  ),
  (
    'b10e8400-e29b-41d4-a716-446655440c51'::uuid,
    'a00e8400-e29b-41d4-a716-446655440c05'::uuid,
    'submitted',
    'accepted',
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    '2026-04-01T14:00:00.000Z',
    'Historical status recorded',
    false,
    '{"fixture":"cursed_historical_c05"}'::jsonb,
    'Casey Cursed'
  ),
  (
    'b10e8400-e29b-41d4-a716-446655440c52'::uuid,
    'a00e8400-e29b-41d4-a716-446655440c05'::uuid,
    'accepted',
    'assigned',
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    '2026-04-02T11:00:00.000Z',
    'Assigned without assignee id',
    false,
    '{"fixture":"cursed_historical_c05","missing_assignee":true}'::jsonb,
    'Casey Cursed'
  ),
  -- c06: submitted then accepted with out-of-order timestamps
  (
    'b10e8400-e29b-41d4-a716-446655440c60'::uuid,
    'a00e8400-e29b-41d4-a716-446655440c06'::uuid,
    NULL,
    'submitted',
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    '2026-05-01T12:00:00.000Z',
    'Historical status recorded',
    true,
    '{"fixture":"cursed_historical_c06","issue":1279}'::jsonb,
    'Casey Cursed'
  ),
  (
    'b10e8400-e29b-41d4-a716-446655440c61'::uuid,
    'a00e8400-e29b-41d4-a716-446655440c06'::uuid,
    'submitted',
    'accepted',
    'bb0e8400-e29b-41d4-a716-446655440011'::uuid,
    '2026-04-30T08:00:00.000Z',
    'Out of order acceptance',
    false,
    '{"fixture":"cursed_historical_c06","out_of_order":true}'::jsonb,
    'Casey Cursed'
  );
