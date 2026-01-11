-- =====================================================
-- EquipQR Seed Data - User Profiles
-- =====================================================

INSERT INTO public.profiles (id, email, name, created_at, updated_at)
VALUES 
  ('bb0e8400-e29b-41d4-a716-446655440001'::uuid, 'owner@apex.test', 'Alex Apex', NOW(), NOW()),
  ('bb0e8400-e29b-41d4-a716-446655440002'::uuid, 'admin@apex.test', 'Amanda Admin', NOW(), NOW()),
  ('bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'tech@apex.test', 'Tom Technician', NOW(), NOW()),
  ('bb0e8400-e29b-41d4-a716-446655440004'::uuid, 'owner@metro.test', 'Marcus Metro', NOW(), NOW()),
  ('bb0e8400-e29b-41d4-a716-446655440005'::uuid, 'tech@metro.test', 'Mike Mechanic', NOW(), NOW()),
  ('bb0e8400-e29b-41d4-a716-446655440006'::uuid, 'owner@valley.test', 'Victor Valley', NOW(), NOW()),
  ('bb0e8400-e29b-41d4-a716-446655440007'::uuid, 'owner@industrial.test', 'Irene Industrial', NOW(), NOW()),
  ('bb0e8400-e29b-41d4-a716-446655440008'::uuid, 'multi@equipqr.test', 'Multi Org User', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
