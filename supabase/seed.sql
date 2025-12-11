-- =====================================================
-- EquipQR Seed Data (Production-Based)
-- Based on actual production data patterns (project: ymxkzronkhwxzcdcbnwq)
-- Note: This seed file can be used with any Supabase project
-- Avoids auth dependencies for reliable testing
-- =====================================================

-- Production backup available: supabase/db_cluster-01-09-2025@07-54-55.backup
-- Contains: 11 orgs, 112 equipment, 25 work orders, 23 equipment notes, 10 profiles

-- Insert realistic test organizations (based on production patterns)
INSERT INTO public.organizations (
  id, 
  name, 
  plan, 
  member_count, 
  max_members, 
  features, 
  created_at, 
  updated_at
) VALUES 
  (
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Apex Construction Company',
    'free'::organization_plan,
    1,
    5,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management'],
    '2024-01-01 00:00:00+00',
    '2024-01-01 00:00:00+00'
  ),
  (
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'Metro Equipment Services', 
    'premium'::organization_plan,
    1,
    50,
    ARRAY['Equipment Management', 'Work Orders', 'Team Management', 'Fleet Tracking'],
    '2024-01-15 00:00:00+00',
    '2024-01-15 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert teams (based on production structure)
INSERT INTO public.teams (
  id,
  organization_id,
  name,
  description,
  created_at,
  updated_at
) VALUES 
  (
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Heavy Equipment Team',
    'Manages excavators, bulldozers, and heavy construction machinery',
    '2024-01-01 00:00:00+00',
    '2024-01-01 00:00:00+00'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'Site Operations Team',
    'Handles generators, compressors, and site support equipment',
    '2024-01-01 00:00:00+00',
    '2024-01-01 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert equipment (based on actual production equipment types)
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
  created_at,
  updated_at
) VALUES 
  (
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    'Portable Generator',
    'Generac',
    'G3500',
    'GEN001PG2023',
    'active'::equipment_status,
    'Construction Site A - Power Station',
    '2023-05-12',
    892.5,
    '{"fuel_type": "gasoline", "output_watts": "3500"}'::jsonb,
    '2024-01-01 00:00:00+00',
    '2024-01-01 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440001'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    '880e8400-e29b-41d4-a716-446655440001'::uuid,
    'Portable Light Tower',
    'Atlas Copco',
    'PLT-800',
    'ATC001LT2022',
    'maintenance'::equipment_status,
    'Equipment Yard - Bay 3',
    '2022-11-20',
    2847.25,
    '{"light_type": "LED", "tower_height": "30_feet"}'::jsonb,
    '2024-01-01 00:00:00+00',
    '2024-01-01 00:00:00+00'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440002'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    '880e8400-e29b-41d4-a716-446655440001'::uuid,
    'Hydraulic Breaker',
    'Bosch',
    'HBX-45',
    'BSH001HB2023',
    'active'::equipment_status,
    'Workshop - Service Bay 1',
    '2023-06-01',
    1245.0,
    '{"attachment_type": "hydraulic_breaker", "impact_energy": "450_joules"}'::jsonb,
    '2024-01-01 00:00:00+00',
    '2024-01-01 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- Note: For full testing with users, work orders, and notes:
-- Restore from production backup: supabase/db_cluster-01-09-2025@07-54-55.backup
-- Or create users through Supabase Auth and use the application interface