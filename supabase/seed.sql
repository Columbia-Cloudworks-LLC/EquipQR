-- =====================================================
-- EquipQR Seed Data
-- Minimal seed file - production data should be restored from backup
-- =====================================================

-- This seed file is intentionally minimal to avoid foreign key constraint issues
-- For comprehensive testing data, restore from production backup:
-- 
-- Option 1: Use the restore script
--   .\restore-production-data.ps1
--
-- Option 2: Manual restore via Supabase Studio
--   1. Open http://127.0.0.1:54323
--   2. Use SQL Editor to restore from backup
--
-- Option 3: Extract specific tables from backup
--   pg_restore --data-only --table=tablename backup.file

-- Basic organizational data for minimal testing (if backup restore isn't used)
INSERT INTO public.organizations (id, name, plan, member_count, max_members, features, created_at, updated_at) VALUES
  ('660e8400-e29b-41d4-a716-446655440000', 'Test Organization', 'free', 1, 5, ARRAY['Equipment Management', 'Work Orders'], '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.teams (id, name, description, organization_id, created_at, updated_at) VALUES
  ('880e8400-e29b-41d4-a716-446655440000', 'Maintenance Team', 'Equipment maintenance team', '660e8400-e29b-41d4-a716-446655440000', '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.equipment (id, name, manufacturer, model, serial_number, status, location, installation_date, organization_id, team_id, working_hours, created_at, updated_at) VALUES
  ('aa0e8400-e29b-41d4-a716-446655440000', 'Test Equipment', 'Test Manufacturer', 'TEST-001', 'SN001', 'active', 'Test Location', '2024-01-01', '660e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440000', 100.0, '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00')
ON CONFLICT (id) DO NOTHING;