-- E2E fixture: fresh org owner for product onboarding wizard (no teams, no equipment)

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
  'bb0e8400-e29b-41d4-a716-446655440009'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'owner@freshstart.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Fresh Start Owner"}'::jsonb,
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
  'bb0e8400-e29b-41d4-a716-446655440009'::uuid,
  'owner@freshstart.test',
  'Fresh Start Owner',
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
  '660e8400-e29b-41d4-a716-446655440009'::uuid,
  'Fresh Start Equipment Co',
  'free'::public.organization_plan,
  1,
  5,
  ARRAY['Equipment Management', 'Work Orders', 'Team Management'],
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_members (
  id,
  organization_id,
  user_id,
  role,
  status,
  joined_date,
  product_onboarding_completed_at
) VALUES (
  'cc0e8400-e29b-41d4-a716-446655440099'::uuid,
  '660e8400-e29b-41d4-a716-446655440009'::uuid,
  'bb0e8400-e29b-41d4-a716-446655440009'::uuid,
  'owner',
  'active',
  NOW(),
  NULL
)
ON CONFLICT (id) DO UPDATE
  SET product_onboarding_completed_at = NULL;

INSERT INTO public.personal_organizations (user_id, organization_id)
VALUES (
  'bb0e8400-e29b-41d4-a716-446655440009'::uuid,
  '660e8400-e29b-41d4-a716-446655440009'::uuid
)
ON CONFLICT DO NOTHING;
