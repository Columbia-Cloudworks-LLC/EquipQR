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
ON CONFLICT (id) DO NOTHING;

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
