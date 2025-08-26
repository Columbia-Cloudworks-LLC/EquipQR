-- =====================================================
-- Supabase Seed Data for Testing
-- This file provides deterministic data for CI/testing
-- Safe for production: uses ON CONFLICT DO NOTHING
-- =====================================================

-- Insert test profiles (users)
INSERT INTO public.profiles (id, name, email, email_private, created_at, updated_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Test Admin User', 'admin@test.equipqr.app', false, '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00'),
  ('550e8400-e29b-41d4-a716-446655440001', 'Test Member User', 'member@test.equipqr.app', false, '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Test Technician', 'tech@test.equipqr.app', false, '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Insert test organizations
INSERT INTO public.organizations (id, name, plan, member_count, max_members, features, created_at, updated_at) VALUES
  ('660e8400-e29b-41d4-a716-446655440000', 'Test Organization', 'free', 3, 5, ARRAY['Equipment Management', 'Work Orders', 'Team Management'], '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00'),
  ('660e8400-e29b-41d4-a716-446655440001', 'Secondary Test Org', 'free', 1, 5, ARRAY['Equipment Management', 'Work Orders'], '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Insert organization memberships
INSERT INTO public.organization_members (id, organization_id, user_id, role, status, joined_date) VALUES
  ('770e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'admin', 'active', '2024-01-01 00:00:00+00'),
  ('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'member', 'active', '2024-01-01 00:00:00+00'),
  ('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'member', 'active', '2024-01-01 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Insert test teams
INSERT INTO public.teams (id, name, description, organization_id, created_at, updated_at) VALUES
  ('880e8400-e29b-41d4-a716-446655440000', 'Maintenance Team', 'Primary maintenance and repair team', '660e8400-e29b-41d4-a716-446655440000', '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00'),
  ('880e8400-e29b-41d4-a716-446655440001', 'Operations Team', 'Daily operations team', '660e8400-e29b-41d4-a716-446655440000', '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Insert team memberships
INSERT INTO public.team_members (id, team_id, user_id, role, joined_date) VALUES
  ('990e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'manager', '2024-01-01 00:00:00+00'),
  ('990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'technician', '2024-01-01 00:00:00+00'),
  ('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'manager', '2024-01-01 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Insert test equipment
INSERT INTO public.equipment (id, name, manufacturer, model, serial_number, status, location, installation_date, organization_id, team_id, working_hours, created_at, updated_at) VALUES
  ('aa0e8400-e29b-41d4-a716-446655440000', 'Test Excavator', 'Caterpillar', 'CAT-320', 'TEST001', 'active', 'Site A - Section 1', '2023-01-15', '660e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440000', 1250.5, '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-446655440001', 'Test Generator', 'Honda', 'EU7000iS', 'TEST002', 'active', 'Site B - Building 2', '2023-03-10', '660e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440001', 890.25, '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00'),
  ('aa0e8400-e29b-41d4-a716-446655440002', 'Test Compressor', 'Atlas Copco', 'GA-15', 'TEST003', 'maintenance', 'Workshop', '2022-11-20', '660e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440000', 2100.75, '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Insert test work orders
INSERT INTO public.work_orders (id, title, description, equipment_id, status, priority, organization_id, created_by, assignee_id, created_date, due_date) VALUES
  ('bb0e8400-e29b-41d4-a716-446655440000', 'Routine Maintenance - Excavator', 'Perform scheduled 1000-hour maintenance on excavator', 'aa0e8400-e29b-41d4-a716-446655440000', 'submitted', 'medium', '660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', '2024-01-01 08:00:00+00', '2024-01-05 17:00:00+00'),
  ('bb0e8400-e29b-41d4-a716-446655440001', 'Generator Repair', 'Generator not starting - check fuel system', 'aa0e8400-e29b-41d4-a716-446655440001', 'in_progress', 'high', '660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '2024-01-02 09:00:00+00', '2024-01-03 17:00:00+00'),
  ('bb0e8400-e29b-41d4-a716-446655440002', 'Compressor Overhaul', 'Complete overhaul of air compressor unit', 'aa0e8400-e29b-41d4-a716-446655440002', 'accepted', 'low', '660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '2024-01-03 10:00:00+00', '2024-01-10 17:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Insert test PM checklist templates  
INSERT INTO public.pm_checklist_templates (id, name, description, organization_id, created_by, template_data, created_at, updated_at) VALUES
  ('cc0e8400-e29b-41d4-a716-446655440000', 'Heavy Equipment - 1000hr Service', 'Standard 1000-hour service checklist for heavy equipment', '660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', '[{"id":"check1","title":"Check engine oil level","type":"checkbox","required":true},{"id":"check2","title":"Inspect hydraulic system","type":"checkbox","required":true},{"id":"check3","title":"Test all safety systems","type":"checkbox","required":true}]', '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00'),
  ('cc0e8400-e29b-41d4-a716-446655440001', 'Generator - Monthly Check', 'Monthly inspection checklist for generators', '660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', '[{"id":"gen1","title":"Check fuel level","type":"checkbox","required":true},{"id":"gen2","title":"Test auto-start function","type":"checkbox","required":true},{"id":"gen3","title":"Inspect air filter","type":"checkbox","required":false}]', '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Insert test notification preferences
INSERT INTO public.notification_preferences (id, user_id, email_work_orders, email_equipment_alerts, email_invitations, email_billing, push_notifications, created_at, updated_at) VALUES
  ('dd0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', true, true, true, true, true, '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00'),
  ('dd0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', true, true, false, false, true, '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00'),
  ('dd0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', true, false, false, false, false, '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00')
ON CONFLICT (id) DO NOTHING;