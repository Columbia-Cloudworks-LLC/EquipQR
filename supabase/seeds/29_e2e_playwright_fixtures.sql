-- =====================================================
-- EquipQR Seed Data - Playwright E2E fixtures
-- =====================================================
-- Deterministic rows for invitation accept, DSR cockpit, and requestor RBAC.

INSERT INTO public.team_members (
  id,
  team_id,
  user_id,
  role,
  joined_date
) VALUES (
  'dd0e8400-e29b-41d4-a716-446655440013'::uuid,
  '880e8400-e29b-41d4-a716-446655440000'::uuid,
  'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
  'requestor',
  '2024-01-04 00:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

-- Multi-org E2E user: team access for org-switching and equipment visibility assertions
INSERT INTO public.team_members (
  id,
  team_id,
  user_id,
  role,
  joined_date
) VALUES
  (
    'dd0e8400-e29b-41d4-a716-446655440014'::uuid,
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid,
    'technician',
    '2024-01-05 00:00:00+00'
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440015'::uuid,
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid,
    'technician',
    '2024-01-06 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Metro Customer Service team: work order on viewer-scoped equipment (Alex Apex viewer E2E)
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
  estimated_hours,
  completed_date,
  updated_at
) VALUES (
  'a00e8400-e29b-41d4-a716-446655440115'::uuid,
  '660e8400-e29b-41d4-a716-446655440001'::uuid,
  'aa0e8400-e29b-41d4-a716-44665544f109'::uuid,
  'Customer Service PM - Bobcat S570',
  'Playwright E2E work order for viewer export evidence on Customer Service team equipment.',
  'completed',
  'medium',
  'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
  'Marcus Metro',
  '880e8400-e29b-41d4-a716-446655440003'::uuid,
  'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
  'Marcus Metro',
  '2025-11-01',
  '2025-11-05',
  1.5,
  '2025-11-04',
  '2025-11-04 16:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

-- Invited-signup E2E user (personal org + pending Apex invitation; onboarding skipped on personal org)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
      AND tgrelid = 'auth.users'::regclass
  ) THEN
    ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
  END IF;

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
    'bb0e8400-e29b-41d4-a716-446655440010'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'e2e.invitee.pending@apex.test',
    public.seed_e2e_encrypted_password(),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'name', 'E2E Pending Invitee',
      'organization_name', 'Invitee Personal Workspace',
      'signup_source', 'invite',
      'invited_organization_id', '660e8400-e29b-41d4-a716-446655440000'
    ),
    false,
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        encrypted_password = EXCLUDED.encrypted_password,
        raw_user_meta_data = EXCLUDED.raw_user_meta_data,
        updated_at = NOW();
EXCEPTION
  WHEN OTHERS THEN
    IF EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'on_auth_user_created'
        AND tgrelid = 'auth.users'::regclass
    ) THEN
      ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
    END IF;
    RAISE;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
      AND tgrelid = 'auth.users'::regclass
  ) THEN
    ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
  END IF;
END $$;

INSERT INTO public.profiles (id, email, name, created_at, updated_at)
VALUES (
  'bb0e8400-e29b-41d4-a716-446655440010'::uuid,
  'e2e.invitee.pending@apex.test',
  'E2E Pending Invitee',
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
  '660e8400-e29b-41d4-a716-446655440010'::uuid,
  'Invitee Personal Workspace',
  'free'::public.organization_plan,
  1,
  5,
  ARRAY['Equipment Management', 'Work Orders', 'Team Management'],
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.personal_organizations (user_id, organization_id)
VALUES (
  'bb0e8400-e29b-41d4-a716-446655440010'::uuid,
  '660e8400-e29b-41d4-a716-446655440010'::uuid
)
ON CONFLICT (user_id) DO UPDATE
  SET organization_id = EXCLUDED.organization_id;

INSERT INTO public.organization_members (
  id,
  organization_id,
  user_id,
  role,
  status,
  joined_date,
  access_source,
  product_onboarding_completed_at
) VALUES (
  'cc0e8400-e29b-41d4-a716-446655440110'::uuid,
  '660e8400-e29b-41d4-a716-446655440010'::uuid,
  'bb0e8400-e29b-41d4-a716-446655440010'::uuid,
  'owner',
  'active',
  NOW(),
  'owner',
  NOW()
)
ON CONFLICT (id) DO UPDATE
  SET product_onboarding_completed_at = COALESCE(
    public.organization_members.product_onboarding_completed_at,
    NOW()
  );

INSERT INTO public.organization_invitations (
  id,
  organization_id,
  email,
  role,
  invited_by,
  status,
  message,
  invitation_token,
  expires_at,
  created_at,
  updated_at
) VALUES (
  'b00e8400-e29b-41d4-a716-446655440001'::uuid,
  '660e8400-e29b-41d4-a716-446655440000'::uuid,
  'e2e.invitee.pending@apex.test',
  'member',
  'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
  'pending',
  'Playwright E2E pending invitation',
  'e2e00000-e29b-41d4-a716-446655440001'::uuid,
  NOW() + INTERVAL '30 days',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
  SET status = 'pending',
      accepted_at = NULL,
      accepted_by = NULL,
      declined_at = NULL,
      expires_at = NOW() + INTERVAL '30 days',
      updated_at = NOW();

INSERT INTO public.dsr_requests (
  id,
  requester_email,
  requester_name,
  request_type,
  status,
  details,
  organization_id,
  received_at,
  due_at,
  created_at,
  updated_at
) VALUES (
  'f00e8400-e29b-41d4-a716-446655440001'::uuid,
  'dsr.requester@example.com',
  'E2E DSR Requester',
  'access',
  'processing',
  'Seeded DSR case for Playwright cockpit drill-down',
  '660e8400-e29b-41d4-a716-446655440000'::uuid,
  NOW() - INTERVAL '2 days',
  NOW() + INTERVAL '43 days',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
