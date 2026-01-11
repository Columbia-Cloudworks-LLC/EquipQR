-- =====================================================
-- EquipQR Seed Data - Team Members
-- =====================================================
-- Assigns users to teams with appropriate roles
-- Team roles: owner, manager, technician, requestor, viewer

INSERT INTO public.team_members (
  id,
  team_id,
  user_id,
  role,
  joined_date
) VALUES 
  -- Heavy Equipment Team (Apex)
  ('dd0e8400-e29b-41d4-a716-446655440001'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'bb0e8400-e29b-41d4-a716-446655440001'::uuid, 'manager', '2024-01-01 00:00:00+00'),
  ('dd0e8400-e29b-41d4-a716-446655440002'::uuid, '880e8400-e29b-41d4-a716-446655440000'::uuid, 'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'technician', '2024-01-03 00:00:00+00'),
  
  -- Site Operations Team (Apex)
  ('dd0e8400-e29b-41d4-a716-446655440003'::uuid, '880e8400-e29b-41d4-a716-446655440001'::uuid, 'bb0e8400-e29b-41d4-a716-446655440002'::uuid, 'manager', '2024-01-02 00:00:00+00'),
  ('dd0e8400-e29b-41d4-a716-446655440004'::uuid, '880e8400-e29b-41d4-a716-446655440001'::uuid, 'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'technician', '2024-01-03 00:00:00+00'),
  
  -- Rental Fleet Team (Metro)
  ('dd0e8400-e29b-41d4-a716-446655440005'::uuid, '880e8400-e29b-41d4-a716-446655440002'::uuid, 'bb0e8400-e29b-41d4-a716-446655440004'::uuid, 'manager', '2024-01-15 00:00:00+00'),
  ('dd0e8400-e29b-41d4-a716-446655440006'::uuid, '880e8400-e29b-41d4-a716-446655440002'::uuid, 'bb0e8400-e29b-41d4-a716-446655440005'::uuid, 'technician', '2024-01-16 00:00:00+00'),
  
  -- Customer Service Team (Metro)
  ('dd0e8400-e29b-41d4-a716-446655440007'::uuid, '880e8400-e29b-41d4-a716-446655440003'::uuid, 'bb0e8400-e29b-41d4-a716-446655440001'::uuid, 'viewer', '2024-01-20 00:00:00+00'),
  
  -- Grounds Crew (Valley)
  ('dd0e8400-e29b-41d4-a716-446655440008'::uuid, '880e8400-e29b-41d4-a716-446655440004'::uuid, 'bb0e8400-e29b-41d4-a716-446655440006'::uuid, 'manager', '2024-02-01 00:00:00+00'),
  ('dd0e8400-e29b-41d4-a716-446655440009'::uuid, '880e8400-e29b-41d4-a716-446655440004'::uuid, 'bb0e8400-e29b-41d4-a716-446655440002'::uuid, 'technician', '2024-02-05 00:00:00+00'),
  
  -- Warehouse Team (Industrial)
  ('dd0e8400-e29b-41d4-a716-446655440010'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'bb0e8400-e29b-41d4-a716-446655440007'::uuid, 'manager', '2024-02-15 00:00:00+00'),
  ('dd0e8400-e29b-41d4-a716-446655440011'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'bb0e8400-e29b-41d4-a716-446655440004'::uuid, 'technician', '2024-02-20 00:00:00+00'),
  ('dd0e8400-e29b-41d4-a716-446655440012'::uuid, '880e8400-e29b-41d4-a716-446655440005'::uuid, 'bb0e8400-e29b-41d4-a716-446655440008'::uuid, 'technician', '2024-02-25 00:00:00+00')
ON CONFLICT (id) DO NOTHING;
