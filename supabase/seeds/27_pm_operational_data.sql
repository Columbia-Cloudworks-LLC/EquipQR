-- =====================================================
-- EquipQR Seed Data - PM Operational Data
-- =====================================================
-- Populates the PM system with realistic operational data so that
-- PM interval tracking, the dashboard Needs Attention count, and
-- the PM Compliance widget all show real data.
--
-- Reference date: ~March 15, 2026
-- Produces a mix of overdue / due-soon / current PM statuses.
--
-- Organization IDs:
--   Apex Construction: 660e8400-e29b-41d4-a716-446655440000
--   Metro Equipment:   660e8400-e29b-41d4-a716-446655440001
--   Industrial:        660e8400-e29b-41d4-a716-446655440003
--   Tom's Services:    660e8400-e29b-41d4-a716-446655440005
--   Mike's Repair:     660e8400-e29b-41d4-a716-446655440006
--
-- PM Template IDs:
--   Forklift PM:     cc0e8400-e29b-41d4-a716-446655440001  (90 days)
--   Pull Trailer PM: cc0e8400-e29b-41d4-a716-446655440002  (90 days)
--   Compressor PM:   cc0e8400-e29b-41d4-a716-446655440003  (500 hours)
--   Scissor Lift PM: cc0e8400-e29b-41d4-a716-446655440004  (180 days)
--   Excavator PM:    cc0e8400-e29b-41d4-a716-446655440005  (250 hours)
--   Skid Steer PM:   cc0e8400-e29b-41d4-a716-446655440006  (200 hours)
-- =====================================================


-- =====================================================
-- SECTION 1: PM Template Interval Values
-- =====================================================

UPDATE public.pm_checklist_templates
SET
  interval_value = v.ival,
  interval_type  = v.itype,
  updated_at     = now()
FROM (VALUES
  ('cc0e8400-e29b-41d4-a716-446655440001'::uuid, 90,  'days'),
  ('cc0e8400-e29b-41d4-a716-446655440002'::uuid, 90,  'days'),
  ('cc0e8400-e29b-41d4-a716-446655440003'::uuid, 500, 'hours'),
  ('cc0e8400-e29b-41d4-a716-446655440004'::uuid, 180, 'days'),
  ('cc0e8400-e29b-41d4-a716-446655440005'::uuid, 250, 'hours'),
  ('cc0e8400-e29b-41d4-a716-446655440006'::uuid, 200, 'hours')
) AS v(tid, ival, itype)
WHERE pm_checklist_templates.id = v.tid;


-- =====================================================
-- SECTION 2: Equipment Default PM Template Assignments
-- =====================================================

UPDATE public.equipment
SET default_pm_template_id = v.tmpl, updated_at = now()
FROM (VALUES
  -- Apex: Excavator PM
  ('aa0e8400-e29b-41d4-a716-446655440000'::uuid, 'cc0e8400-e29b-41d4-a716-446655440005'::uuid),
  ('aa0e8400-e29b-41d4-a716-446655440040'::uuid, 'cc0e8400-e29b-41d4-a716-446655440005'::uuid),
  ('aa0e8400-e29b-41d4-a716-446655440041'::uuid, 'cc0e8400-e29b-41d4-a716-446655440005'::uuid),
  -- Metro: Skid Steer PM (Bobcats)
  ('aa0e8400-e29b-41d4-a716-446655440010'::uuid, 'cc0e8400-e29b-41d4-a716-446655440006'::uuid),
  ('aa0e8400-e29b-41d4-a716-446655440050'::uuid, 'cc0e8400-e29b-41d4-a716-446655440006'::uuid),
  ('aa0e8400-e29b-41d4-a716-446655440051'::uuid, 'cc0e8400-e29b-41d4-a716-446655440006'::uuid),
  -- Metro: Scissor Lift PM (aerials)
  ('aa0e8400-e29b-41d4-a716-446655440011'::uuid, 'cc0e8400-e29b-41d4-a716-446655440004'::uuid),
  ('aa0e8400-e29b-41d4-a716-446655440012'::uuid, 'cc0e8400-e29b-41d4-a716-446655440004'::uuid),
  ('aa0e8400-e29b-41d4-a716-446655440052'::uuid, 'cc0e8400-e29b-41d4-a716-446655440004'::uuid),
  ('aa0e8400-e29b-41d4-a716-446655440053'::uuid, 'cc0e8400-e29b-41d4-a716-446655440004'::uuid),
  ('aa0e8400-e29b-41d4-a716-446655440054'::uuid, 'cc0e8400-e29b-41d4-a716-446655440004'::uuid),
  -- Industrial: Forklift PM
  ('aa0e8400-e29b-41d4-a716-446655440030'::uuid, 'cc0e8400-e29b-41d4-a716-446655440001'::uuid),
  ('aa0e8400-e29b-41d4-a716-446655440031'::uuid, 'cc0e8400-e29b-41d4-a716-446655440001'::uuid),
  ('aa0e8400-e29b-41d4-a716-446655440070'::uuid, 'cc0e8400-e29b-41d4-a716-446655440001'::uuid),
  ('aa0e8400-e29b-41d4-a716-446655440071'::uuid, 'cc0e8400-e29b-41d4-a716-446655440001'::uuid),
  ('aa0e8400-e29b-41d4-a716-446655440072'::uuid, 'cc0e8400-e29b-41d4-a716-446655440001'::uuid),
  ('aa0e8400-e29b-41d4-a716-446655440073'::uuid, 'cc0e8400-e29b-41d4-a716-446655440001'::uuid),
  -- Industrial: Compressor PM
  ('aa0e8400-e29b-41d4-a716-446655440032'::uuid, 'cc0e8400-e29b-41d4-a716-446655440003'::uuid),
  -- Mike's: Compressor PM
  ('aa0e8400-e29b-41d4-a716-446655440080'::uuid, 'cc0e8400-e29b-41d4-a716-446655440003'::uuid),
  -- Tom's: Compressor PM + Skid Steer PM
  ('aa0e8400-e29b-41d4-a716-446655440090'::uuid, 'cc0e8400-e29b-41d4-a716-446655440003'::uuid),
  ('aa0e8400-e29b-41d4-a716-446655440091'::uuid, 'cc0e8400-e29b-41d4-a716-446655440006'::uuid)
) AS v(eid, tmpl)
WHERE equipment.id = v.eid;


-- =====================================================
-- SECTION 3: PM Work Orders
-- =====================================================
-- Naming convention for UUIDs:
--   Work orders: a00e8400-e29b-41d4-a716-4466554401XX
--   (starting at 100 to avoid conflicts with existing WOs 001–031)

INSERT INTO public.work_orders (
  id, organization_id, equipment_id,
  title, description,
  status, priority,
  assignee_id, assignee_name,
  team_id, created_by, created_by_name,
  created_date, due_date, estimated_hours, completed_date, updated_at,
  has_pm, pm_required
) VALUES

  -- ===========================================
  -- Apex Construction PM Work Orders
  -- ===========================================

  -- H1: CAT 320 historical PM (completed Sep 2025)
  (
    'a00e8400-e29b-41d4-a716-446655440100'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    '250-Hour PM - CAT 320 Excavator',
    'Scheduled 250-hour preventive maintenance. Engine oil, hydraulic check, undercarriage inspection.',
    'completed', 'medium',
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'Tom Technician',
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid, 'Amanda Admin',
    '2025-09-08', '2025-09-15', 5, '2025-09-12',
    '2025-09-12 16:00:00+00', true, true
  ),

  -- C1: CAT 320 latest PM — OVERDUE (300 hrs elapsed > 250 hr interval)
  (
    'a00e8400-e29b-41d4-a716-446655440101'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    '250-Hour PM - CAT 320 Excavator',
    'Scheduled 250-hour preventive maintenance. Full Excavator PM checklist.',
    'completed', 'high',
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'Tom Technician',
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid, 'Amanda Admin',
    '2026-01-05', '2026-01-12', 5, '2026-01-10',
    '2026-01-10 16:00:00+00', true, true
  ),

  -- C2: Komatsu PC210 — CURRENT (100 hrs of 250 hr interval)
  (
    'a00e8400-e29b-41d4-a716-446655440102'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440041'::uuid,
    '250-Hour PM - Komatsu PC210 Excavator',
    'Runtime-based PM. Inspect engine, hydraulics, undercarriage, and safety systems.',
    'completed', 'medium',
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'Tom Technician',
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid, 'Alex Apex',
    '2026-02-10', '2026-02-17', 5, '2026-02-15',
    '2026-02-15 15:00:00+00', true, true
  ),

  -- C3: CAT 320 #2 — DUE SOON (210 hrs of 250 = 84%)
  (
    'a00e8400-e29b-41d4-a716-446655440103'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440040'::uuid,
    '250-Hour PM - CAT 320 Excavator #2',
    'Runtime-based PM. Complete Excavator PM checklist per maintenance schedule.',
    'completed', 'medium',
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'Tom Technician',
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid, 'Amanda Admin',
    '2026-01-15', '2026-01-22', 5, '2026-01-20',
    '2026-01-20 14:00:00+00', true, true
  ),

  -- ===========================================
  -- Metro Equipment PM Work Orders
  -- ===========================================

  -- H2: Bobcat S650 historical PM (completed Nov 2025)
  (
    'a00e8400-e29b-41d4-a716-446655440110'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440010'::uuid,
    '200-Hour PM - Bobcat S650 Skid Steer',
    'Scheduled 200-hour PM. Engine service, hydraulic filter, drive system check.',
    'completed', 'medium',
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid, 'Mike Mechanic',
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid, 'Marcus Metro',
    '2025-11-03', '2025-11-10', 3, '2025-11-08',
    '2025-11-08 15:00:00+00', true, true
  ),

  -- C4: Bobcat S650 — CURRENT (50 hrs of 200 hr interval)
  (
    'a00e8400-e29b-41d4-a716-446655440111'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440010'::uuid,
    '200-Hour PM - Bobcat S650 Skid Steer',
    'Runtime-based PM. Full Skid Steer PM checklist completed.',
    'completed', 'medium',
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid, 'Mike Mechanic',
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid, 'Marcus Metro',
    '2026-02-15', '2026-02-22', 3, '2026-02-20',
    '2026-02-20 16:00:00+00', true, true
  ),

  -- C5: Genie GS-2669 — OVERDUE (200 days > 180-day interval)
  (
    'a00e8400-e29b-41d4-a716-446655440112'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440012'::uuid,
    '180-Day PM - Genie GS-2669 Scissor Lift',
    'Semi-annual ANSI inspection. Platform, hydraulics, electrical, safety systems.',
    'completed', 'high',
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid, 'Mike Mechanic',
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid, 'Marcus Metro',
    '2025-08-20', '2025-08-28', 4, '2025-08-27',
    '2025-08-27 16:00:00+00', true, true
  ),

  -- C6: JLG 450AJ — DUE SOON (150 days of 180 = 83%)
  (
    'a00e8400-e29b-41d4-a716-446655440113'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440011'::uuid,
    '180-Day PM - JLG 450AJ Boom Lift',
    'Semi-annual PM per aerial equipment schedule. Hydraulic, electrical, safety.',
    'completed', 'medium',
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid, 'Mike Mechanic',
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid, 'Marcus Metro',
    '2025-10-10', '2025-10-18', 4, '2025-10-17',
    '2025-10-17 15:00:00+00', true, true
  ),

  -- A1: Bobcat S770 — IN PROGRESS (active PM work)
  (
    'a00e8400-e29b-41d4-a716-446655440114'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440051'::uuid,
    '200-Hour PM - Bobcat S770 Skid Steer',
    'First scheduled PM for this unit. Complete full Skid Steer PM checklist.',
    'in_progress', 'high',
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid, 'Mike Mechanic',
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid, 'Marcus Metro',
    '2026-03-10', '2026-03-17', 4, NULL,
    '2026-03-12 10:00:00+00', true, true
  ),

  -- ===========================================
  -- Industrial Rentals PM Work Orders
  -- ===========================================

  -- H3: Toyota Forklift historical PM (completed Sep 2025)
  (
    'a00e8400-e29b-41d4-a716-446655440120'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440030'::uuid,
    'Quarterly PM - Toyota 8FGU25 Forklift',
    'Q3 2025 forklift PM. Oil change, brake check, mast inspection.',
    'completed', 'medium',
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid, 'Multi Org User',
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid, 'Irene Industrial',
    '2025-08-25', '2025-09-02', 3, '2025-09-01',
    '2025-09-01 15:00:00+00', true, true
  ),

  -- C7: Toyota Forklift — OVERDUE (100 days > 90-day interval)
  (
    'a00e8400-e29b-41d4-a716-446655440121'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440030'::uuid,
    'Quarterly PM - Toyota 8FGU25 Forklift',
    'Q4 2025 forklift PM. Full Forklift PM checklist.',
    'completed', 'high',
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid, 'Multi Org User',
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid, 'Irene Industrial',
    '2025-11-28', '2025-12-06', 3, '2025-12-05',
    '2025-12-05 16:00:00+00', true, true
  ),

  -- C8: Hyster H50FT — CURRENT (45 days of 90-day interval)
  (
    'a00e8400-e29b-41d4-a716-446655440122'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440072'::uuid,
    'Quarterly PM - Hyster H50FT Forklift',
    'Q1 2026 forklift PM. Brake inspection, mast chains, hydraulic system.',
    'completed', 'medium',
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid, 'Multi Org User',
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid, 'Irene Industrial',
    '2026-01-22', '2026-01-30', 3, '2026-01-29',
    '2026-01-29 15:00:00+00', true, true
  ),

  -- C9: Crown FC5245 — DUE SOON (76 days of 90 = 84%)
  (
    'a00e8400-e29b-41d4-a716-446655440123'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440073'::uuid,
    'Quarterly PM - Crown FC5245 Forklift',
    'Q4 2025 PM for electric forklift. Battery, charger, mast, electrical.',
    'completed', 'medium',
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid, 'Multi Org User',
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid, 'Irene Industrial',
    '2025-12-23', '2025-12-31', 3, '2025-12-30',
    '2025-12-30 14:00:00+00', true, true
  ),

  -- H4: IR P185 Compressor historical PM (completed Jun 2025)
  (
    'a00e8400-e29b-41d4-a716-446655440124'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440032'::uuid,
    '500-Hour PM - IR P185 Compressor',
    'Runtime PM at 1296 hours. Air filter, safety valve, oil change, belt inspection.',
    'completed', 'medium',
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid, 'Marcus Metro',
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid, 'Irene Industrial',
    '2025-06-08', '2025-06-16', 4, '2025-06-15',
    '2025-06-15 14:00:00+00', true, true
  ),

  -- C10: IR P185 Compressor — OVERDUE (550 hrs > 500 hr interval)
  (
    'a00e8400-e29b-41d4-a716-446655440125'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440032'::uuid,
    '500-Hour PM - IR P185 Compressor',
    'Runtime PM at 1796 hours. Full Compressor PM checklist.',
    'completed', 'high',
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid, 'Multi Org User',
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid, 'Irene Industrial',
    '2025-08-08', '2025-08-16', 4, '2025-08-15',
    '2025-08-15 16:00:00+00', true, true
  ),

  -- A2: Toyota Forklift #3 — PENDING (in maintenance bay)
  (
    'a00e8400-e29b-41d4-a716-446655440126'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440071'::uuid,
    'Quarterly PM - Toyota 8FGU25 Forklift #3',
    'Overdue quarterly PM. Unit in maintenance bay — complete before returning to service.',
    'assigned', 'high',
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid, 'Multi Org User',
    '880e8400-e29b-41d4-a716-446655440005'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid, 'Irene Industrial',
    '2026-03-10', '2026-03-14', 3, NULL,
    '2026-03-10 09:00:00+00', true, true
  ),

  -- ===========================================
  -- Mike's Repair Shop PM Work Orders
  -- ===========================================

  -- C11: Sullair Compressor — OVERDUE (600 hrs > 500 hr interval)
  (
    'a00e8400-e29b-41d4-a716-446655440130'::uuid,
    '660e8400-e29b-41d4-a716-446655440006'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440080'::uuid,
    '500-Hour PM - Sullair 185 Compressor',
    'Runtime PM at 2856 hours. Oil change, air filter, safety valve, belt check.',
    'completed', 'medium',
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid, 'Mike Mechanic',
    NULL,
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid, 'Mike Mechanic',
    '2025-07-14', '2025-07-21', 3, '2025-07-20',
    '2025-07-20 15:00:00+00', true, true
  ),

  -- ===========================================
  -- Tom's Field Services PM Work Orders
  -- ===========================================

  -- C12: Doosan P185 — CURRENT (300 hrs of 500 hr interval)
  (
    'a00e8400-e29b-41d4-a716-446655440131'::uuid,
    '660e8400-e29b-41d4-a716-446655440005'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440090'::uuid,
    '500-Hour PM - Doosan P185 Compressor',
    'Runtime PM at 2045 hours. Air system, engine, safety checks per Compressor PM.',
    'completed', 'medium',
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'Tom Technician',
    NULL,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'Tom Technician',
    '2025-12-03', '2025-12-11', 3, '2025-12-10',
    '2025-12-10 14:00:00+00', true, true
  ),

  -- C13: Vermeer S800TX — DUE SOON (160 hrs of 200 = 80%)
  (
    'a00e8400-e29b-41d4-a716-446655440132'::uuid,
    '660e8400-e29b-41d4-a716-446655440005'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440091'::uuid,
    '200-Hour PM - Vermeer S800TX Mini Skid Steer',
    'Runtime PM at 408 hours. Engine, hydraulic, drive, safety per Skid Steer PM.',
    'completed', 'medium',
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'Tom Technician',
    NULL,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'Tom Technician',
    '2026-01-08', '2026-01-16', 3, '2026-01-15',
    '2026-01-15 14:00:00+00', true, true
  )

ON CONFLICT (id) DO NOTHING;


-- =====================================================
-- SECTION 4: Preventative Maintenance Records
-- =====================================================
-- UUID prefix: dd0e8400-e29b-41d4-a716-446655440XXX
--
-- Interval math reference (as of ~March 15 2026):
--
-- Hours-based:
--   overdue  = equipment.working_hours − pm.hours_at_completion > interval
--   current  = gap < interval × 0.8
--   due_soon = gap >= interval × 0.8 AND gap <= interval
--
-- Days-based:
--   overdue  = days_since(completed_at) > interval
--   current  = days_since < interval × 0.8
--   due_soon = days_since >= interval × 0.8 AND days_since <= interval

INSERT INTO public.preventative_maintenance (
  id, work_order_id, equipment_id, organization_id, template_id,
  created_by, completed_at, completed_by, completed_by_name, created_by_name,
  status, checklist_data, notes,
  equipment_working_hours_at_completion,
  created_at, updated_at
) VALUES

  -- ===========================================
  -- Apex Construction PMs  (Excavator PM, 250 hrs)
  -- ===========================================

  -- H1: CAT 320 historical (completed at 992.5 hrs)
  (
    'dd0e8400-e29b-41d4-a716-446655440001'::uuid,
    'a00e8400-e29b-41d4-a716-446655440100'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'cc0e8400-e29b-41d4-a716-446655440005'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
    '2025-09-12 16:00:00+00',
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'Tom Technician', 'Amanda Admin',
    'completed',
    '[{"id":"v1","title":"Walk-Around Inspection","required":true,"section":"Visual Inspection","condition":4},{"id":"e1","title":"Engine Oil & Filter Change","required":true,"section":"Engine","condition":5},{"id":"h1","title":"Hydraulic System Check","required":true,"section":"Hydraulic","condition":4},{"id":"u1","title":"Track Tension & Wear","required":true,"section":"Undercarriage","condition":4},{"id":"s1","title":"Safety Systems Test","required":true,"section":"Safety","condition":5}]'::jsonb,
    'Regular 250-hour PM completed. All systems within spec.',
    992.5,
    '2025-09-08 08:00:00+00', '2025-09-12 16:00:00+00'
  ),

  -- C1: CAT 320 latest — OVERDUE (1542.5 − 1242.5 = 300 > 250)
  (
    'dd0e8400-e29b-41d4-a716-446655440002'::uuid,
    'a00e8400-e29b-41d4-a716-446655440101'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440000'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'cc0e8400-e29b-41d4-a716-446655440005'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
    '2026-01-10 16:00:00+00',
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'Tom Technician', 'Amanda Admin',
    'completed',
    '[{"id":"v1","title":"Walk-Around Inspection","required":true,"section":"Visual Inspection","condition":5},{"id":"e1","title":"Engine Oil & Filter Change","required":true,"section":"Engine","condition":5},{"id":"h1","title":"Hydraulic System Check","required":true,"section":"Hydraulic","condition":4},{"id":"u1","title":"Track Tension & Wear","required":true,"section":"Undercarriage","condition":3},{"id":"s1","title":"Safety Systems Test","required":true,"section":"Safety","condition":5}]'::jsonb,
    'Full 250-hr PM completed. Minor track wear noted — monitor at next service.',
    1242.5,
    '2026-01-05 08:00:00+00', '2026-01-10 16:00:00+00'
  ),

  -- C2: Komatsu PC210 — CURRENT (3245.5 − 3145.5 = 100 < 200)
  (
    'dd0e8400-e29b-41d4-a716-446655440003'::uuid,
    'a00e8400-e29b-41d4-a716-446655440102'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440041'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'cc0e8400-e29b-41d4-a716-446655440005'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
    '2026-02-15 15:00:00+00',
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'Tom Technician', 'Alex Apex',
    'completed',
    '[{"id":"v1","title":"Walk-Around Inspection","required":true,"section":"Visual Inspection","condition":5},{"id":"e1","title":"Engine Oil & Filter Change","required":true,"section":"Engine","condition":5},{"id":"h1","title":"Hydraulic System Check","required":true,"section":"Hydraulic","condition":5},{"id":"u1","title":"Track Tension & Wear","required":true,"section":"Undercarriage","condition":4},{"id":"s1","title":"Safety Systems Test","required":true,"section":"Safety","condition":5}]'::jsonb,
    '250-hr PM completed. All items in good condition. Komatsu running well.',
    3145.5,
    '2026-02-10 08:00:00+00', '2026-02-15 15:00:00+00'
  ),

  -- C3: CAT 320 #2 — DUE SOON (1876.25 − 1666.25 = 210, 84% of 250)
  (
    'dd0e8400-e29b-41d4-a716-446655440004'::uuid,
    'a00e8400-e29b-41d4-a716-446655440103'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440040'::uuid,
    '660e8400-e29b-41d4-a716-446655440000'::uuid,
    'cc0e8400-e29b-41d4-a716-446655440005'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440002'::uuid,
    '2026-01-20 14:00:00+00',
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'Tom Technician', 'Amanda Admin',
    'completed',
    '[{"id":"v1","title":"Walk-Around Inspection","required":true,"section":"Visual Inspection","condition":4},{"id":"e1","title":"Engine Oil & Filter Change","required":true,"section":"Engine","condition":5},{"id":"h1","title":"Hydraulic System Check","required":true,"section":"Hydraulic","condition":4},{"id":"u1","title":"Track Tension & Wear","required":true,"section":"Undercarriage","condition":4},{"id":"s1","title":"Safety Systems Test","required":true,"section":"Safety","condition":5}]'::jsonb,
    '250-hr PM completed. Hydraulic hose on boom showing age — schedule replacement.',
    1666.25,
    '2026-01-15 08:00:00+00', '2026-01-20 14:00:00+00'
  ),

  -- ===========================================
  -- Metro Equipment PMs
  -- ===========================================

  -- H2: Bobcat S650 historical (completed at 206 hrs, Skid Steer PM 200 hrs)
  (
    'dd0e8400-e29b-41d4-a716-446655440010'::uuid,
    'a00e8400-e29b-41d4-a716-446655440110'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440010'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'cc0e8400-e29b-41d4-a716-446655440006'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2025-11-08 15:00:00+00',
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid, 'Mike Mechanic', 'Marcus Metro',
    'completed',
    '[{"id":"v1","title":"External Inspection","required":true,"section":"Visual Inspection","condition":4},{"id":"e1","title":"Engine Oil & Filter","required":true,"section":"Engine","condition":5},{"id":"h1","title":"Hydraulic Fluid & Filters","required":true,"section":"Hydraulic","condition":4},{"id":"d1","title":"Drive Chain/Belt Tension","required":true,"section":"Drive System","condition":4},{"id":"s1","title":"ROPS & Safety Devices","required":true,"section":"Safety","condition":5}]'::jsonb,
    'First 200-hr PM for this unit. All systems in good condition.',
    206.0,
    '2025-11-03 08:00:00+00', '2025-11-08 15:00:00+00'
  ),

  -- C4: Bobcat S650 — CURRENT (456 − 406 = 50 < 160)
  (
    'dd0e8400-e29b-41d4-a716-446655440011'::uuid,
    'a00e8400-e29b-41d4-a716-446655440111'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440010'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'cc0e8400-e29b-41d4-a716-446655440006'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2026-02-20 16:00:00+00',
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid, 'Mike Mechanic', 'Marcus Metro',
    'completed',
    '[{"id":"v1","title":"External Inspection","required":true,"section":"Visual Inspection","condition":5},{"id":"e1","title":"Engine Oil & Filter","required":true,"section":"Engine","condition":5},{"id":"h1","title":"Hydraulic Fluid & Filters","required":true,"section":"Hydraulic","condition":5},{"id":"d1","title":"Drive Chain/Belt Tension","required":true,"section":"Drive System","condition":4},{"id":"s1","title":"ROPS & Safety Devices","required":true,"section":"Safety","condition":5}]'::jsonb,
    '200-hr PM completed. Unit ready for next rental.',
    406.0,
    '2026-02-15 08:00:00+00', '2026-02-20 16:00:00+00'
  ),

  -- C5: Genie GS-2669 — OVERDUE (200 days since Aug 27 > 180-day interval)
  (
    'dd0e8400-e29b-41d4-a716-446655440012'::uuid,
    'a00e8400-e29b-41d4-a716-446655440112'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440012'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'cc0e8400-e29b-41d4-a716-446655440004'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2025-08-27 16:00:00+00',
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid, 'Mike Mechanic', 'Marcus Metro',
    'completed',
    '[{"id":"v1","title":"Platform & Guardrail Inspection","required":true,"section":"Visual Inspection","condition":4},{"id":"h1","title":"Hydraulic Fluid Level","required":true,"section":"Hydraulic System","condition":5},{"id":"e1","title":"Battery & Charger Check","required":true,"section":"Electrical","condition":3},{"id":"s1","title":"Emergency Lowering Test","required":true,"section":"Safety Systems","condition":5},{"id":"f1","title":"Lift & Drive Function Test","required":true,"section":"Function Test","condition":4}]'::jsonb,
    'Semi-annual ANSI inspection complete. Battery showing age — schedule replacement.',
    NULL,
    '2025-08-20 08:00:00+00', '2025-08-27 16:00:00+00'
  ),

  -- C6: JLG 450AJ — DUE SOON (150 days since Oct 17, 83% of 180)
  (
    'dd0e8400-e29b-41d4-a716-446655440013'::uuid,
    'a00e8400-e29b-41d4-a716-446655440113'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440011'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'cc0e8400-e29b-41d4-a716-446655440004'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    '2025-10-17 15:00:00+00',
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid, 'Mike Mechanic', 'Marcus Metro',
    'completed',
    '[{"id":"v1","title":"Platform & Guardrail Inspection","required":true,"section":"Visual Inspection","condition":5},{"id":"h1","title":"Hydraulic Fluid Level","required":true,"section":"Hydraulic System","condition":5},{"id":"e1","title":"Battery & Charger Check","required":true,"section":"Electrical","condition":4},{"id":"s1","title":"Emergency Lowering Test","required":true,"section":"Safety Systems","condition":5},{"id":"f1","title":"Lift & Drive Function Test","required":true,"section":"Function Test","condition":5}]'::jsonb,
    'Semi-annual PM completed. All systems operating within spec.',
    NULL,
    '2025-10-10 08:00:00+00', '2025-10-17 15:00:00+00'
  ),

  -- A1: Bobcat S770 — IN PROGRESS
  (
    'dd0e8400-e29b-41d4-a716-446655440014'::uuid,
    'a00e8400-e29b-41d4-a716-446655440114'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440051'::uuid,
    '660e8400-e29b-41d4-a716-446655440001'::uuid,
    'cc0e8400-e29b-41d4-a716-446655440006'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
    NULL,
    NULL, NULL, 'Marcus Metro',
    'in_progress',
    '[{"id":"v1","title":"External Inspection","required":true,"section":"Visual Inspection","condition":4},{"id":"e1","title":"Engine Oil & Filter","required":true,"section":"Engine","condition":5},{"id":"h1","title":"Hydraulic Fluid & Filters","required":true,"section":"Hydraulic","condition":null},{"id":"d1","title":"Drive Chain/Belt Tension","required":true,"section":"Drive System","condition":null},{"id":"s1","title":"ROPS & Safety Devices","required":true,"section":"Safety","condition":null}]'::jsonb,
    NULL,
    NULL,
    '2026-03-10 09:00:00+00', '2026-03-12 10:00:00+00'
  ),

  -- ===========================================
  -- Industrial Rentals PMs
  -- ===========================================

  -- H3: Toyota Forklift historical (completed Sep 2025, Forklift PM 90 days)
  (
    'dd0e8400-e29b-41d4-a716-446655440020'::uuid,
    'a00e8400-e29b-41d4-a716-446655440120'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440030'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'cc0e8400-e29b-41d4-a716-446655440001'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-09-01 15:00:00+00',
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid, 'Multi Org User', 'Irene Industrial',
    'completed',
    '[{"id":"v1","title":"Oil/Coolant Leaks","required":true,"section":"Visual Inspection","condition":4},{"id":"e1","title":"Change Engine Oil & Filter","required":true,"section":"Engine Compartment","condition":5},{"id":"h1","title":"Inspect Fluid Level & Quality","required":true,"section":"Hydraulic Inspection","condition":4},{"id":"b1","title":"Test Service Brake Operation","required":true,"section":"Brake","condition":5},{"id":"f1","title":"Road Test & Operation Check","required":true,"section":"Final Inspection","condition":4}]'::jsonb,
    'Q3 quarterly PM completed. All checks passed.',
    NULL,
    '2025-08-25 08:00:00+00', '2025-09-01 15:00:00+00'
  ),

  -- C7: Toyota Forklift — OVERDUE (100 days since Dec 5 > 90)
  (
    'dd0e8400-e29b-41d4-a716-446655440021'::uuid,
    'a00e8400-e29b-41d4-a716-446655440121'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440030'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'cc0e8400-e29b-41d4-a716-446655440001'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-12-05 16:00:00+00',
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid, 'Multi Org User', 'Irene Industrial',
    'completed',
    '[{"id":"v1","title":"Oil/Coolant Leaks","required":true,"section":"Visual Inspection","condition":5},{"id":"e1","title":"Change Engine Oil & Filter","required":true,"section":"Engine Compartment","condition":5},{"id":"h1","title":"Inspect Fluid Level & Quality","required":true,"section":"Hydraulic Inspection","condition":4},{"id":"b1","title":"Test Service Brake Operation","required":true,"section":"Brake","condition":4},{"id":"f1","title":"Road Test & Operation Check","required":true,"section":"Final Inspection","condition":5}]'::jsonb,
    'Q4 quarterly PM completed. Brakes showing normal wear.',
    NULL,
    '2025-11-28 08:00:00+00', '2025-12-05 16:00:00+00'
  ),

  -- C8: Hyster H50FT — CURRENT (45 days since Jan 29 < 72)
  (
    'dd0e8400-e29b-41d4-a716-446655440022'::uuid,
    'a00e8400-e29b-41d4-a716-446655440122'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440072'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'cc0e8400-e29b-41d4-a716-446655440001'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2026-01-29 15:00:00+00',
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid, 'Multi Org User', 'Irene Industrial',
    'completed',
    '[{"id":"v1","title":"Oil/Coolant Leaks","required":true,"section":"Visual Inspection","condition":5},{"id":"e1","title":"Change Engine Oil & Filter","required":true,"section":"Engine Compartment","condition":5},{"id":"h1","title":"Inspect Fluid Level & Quality","required":true,"section":"Hydraulic Inspection","condition":5},{"id":"b1","title":"Test Service Brake Operation","required":true,"section":"Brake","condition":5},{"id":"f1","title":"Road Test & Operation Check","required":true,"section":"Final Inspection","condition":5}]'::jsonb,
    'Q1 2026 quarterly PM. Unit in excellent condition.',
    NULL,
    '2026-01-22 08:00:00+00', '2026-01-29 15:00:00+00'
  ),

  -- C9: Crown FC5245 — DUE SOON (76 days since Dec 30, 84% of 90)
  (
    'dd0e8400-e29b-41d4-a716-446655440023'::uuid,
    'a00e8400-e29b-41d4-a716-446655440123'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440073'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'cc0e8400-e29b-41d4-a716-446655440001'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-12-30 14:00:00+00',
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid, 'Multi Org User', 'Irene Industrial',
    'completed',
    '[{"id":"v1","title":"Oil/Coolant Leaks","required":true,"section":"Visual Inspection","condition":5},{"id":"e1","title":"Change Engine Oil & Filter","required":true,"section":"Engine Compartment","condition":5},{"id":"h1","title":"Inspect Fluid Level & Quality","required":true,"section":"Hydraulic Inspection","condition":5},{"id":"b1","title":"Test Service Brake Operation","required":true,"section":"Brake","condition":5},{"id":"f1","title":"Road Test & Operation Check","required":true,"section":"Final Inspection","condition":5}]'::jsonb,
    'Electric forklift PM. Battery and charger in excellent condition.',
    NULL,
    '2025-12-23 08:00:00+00', '2025-12-30 14:00:00+00'
  ),

  -- H4: IR P185 Compressor historical (completed at 1295.75 hrs, Compressor PM 500 hrs)
  (
    'dd0e8400-e29b-41d4-a716-446655440024'::uuid,
    'a00e8400-e29b-41d4-a716-446655440124'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440032'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'cc0e8400-e29b-41d4-a716-446655440003'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-06-15 14:00:00+00',
    'bb0e8400-e29b-41d4-a716-446655440004'::uuid, 'Marcus Metro', 'Irene Industrial',
    'completed',
    '[{"id":"v1","title":"Check for Oil/Air Leaks","required":true,"section":"Visual Inspection","condition":4},{"id":"e1","title":"Check Engine Oil Level","required":true,"section":"Engine","condition":5},{"id":"a1","title":"Check Air Filter","required":true,"section":"Air System","condition":4},{"id":"s1","title":"Safety Valve Operation","required":true,"section":"Safety","condition":5},{"id":"p1","title":"CFM Output Test","required":true,"section":"Performance","condition":4}]'::jsonb,
    '500-hr runtime PM. Air filter replaced, safety valve tested.',
    1295.75,
    '2025-06-08 08:00:00+00', '2025-06-15 14:00:00+00'
  ),

  -- C10: IR P185 Compressor — OVERDUE (2345.75 − 1795.75 = 550 > 500)
  (
    'dd0e8400-e29b-41d4-a716-446655440025'::uuid,
    'a00e8400-e29b-41d4-a716-446655440125'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440032'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'cc0e8400-e29b-41d4-a716-446655440003'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    '2025-08-15 16:00:00+00',
    'bb0e8400-e29b-41d4-a716-446655440008'::uuid, 'Multi Org User', 'Irene Industrial',
    'completed',
    '[{"id":"v1","title":"Check for Oil/Air Leaks","required":true,"section":"Visual Inspection","condition":3},{"id":"e1","title":"Check Engine Oil Level","required":true,"section":"Engine","condition":4},{"id":"a1","title":"Check Air Filter","required":true,"section":"Air System","condition":5},{"id":"s1","title":"Safety Valve Operation","required":true,"section":"Safety","condition":4},{"id":"p1","title":"CFM Output Test","required":true,"section":"Performance","condition":4}]'::jsonb,
    '500-hr runtime PM. Minor oil seepage noted at compressor head gasket.',
    1795.75,
    '2025-08-08 08:00:00+00', '2025-08-15 16:00:00+00'
  ),

  -- A2: Toyota Forklift #3 — PENDING
  (
    'dd0e8400-e29b-41d4-a716-446655440026'::uuid,
    'a00e8400-e29b-41d4-a716-446655440126'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440071'::uuid,
    '660e8400-e29b-41d4-a716-446655440003'::uuid,
    'cc0e8400-e29b-41d4-a716-446655440001'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440007'::uuid,
    NULL,
    NULL, NULL, 'Irene Industrial',
    'pending',
    '[{"id":"v1","title":"Oil/Coolant Leaks","required":true,"section":"Visual Inspection","condition":null},{"id":"e1","title":"Change Engine Oil & Filter","required":true,"section":"Engine Compartment","condition":null},{"id":"h1","title":"Inspect Fluid Level & Quality","required":true,"section":"Hydraulic Inspection","condition":null},{"id":"b1","title":"Test Service Brake Operation","required":true,"section":"Brake","condition":null},{"id":"f1","title":"Road Test & Operation Check","required":true,"section":"Final Inspection","condition":null}]'::jsonb,
    NULL,
    NULL,
    '2026-03-10 09:00:00+00', '2026-03-10 09:00:00+00'
  ),

  -- ===========================================
  -- Mike's Repair Shop PMs
  -- ===========================================

  -- C11: Sullair Compressor — OVERDUE (3456 − 2856 = 600 > 500)
  (
    'dd0e8400-e29b-41d4-a716-446655440030'::uuid,
    'a00e8400-e29b-41d4-a716-446655440130'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440080'::uuid,
    '660e8400-e29b-41d4-a716-446655440006'::uuid,
    'cc0e8400-e29b-41d4-a716-446655440003'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid,
    '2025-07-20 15:00:00+00',
    'bb0e8400-e29b-41d4-a716-446655440005'::uuid, 'Mike Mechanic', 'Mike Mechanic',
    'completed',
    '[{"id":"v1","title":"Check for Oil/Air Leaks","required":true,"section":"Visual Inspection","condition":3},{"id":"e1","title":"Check Engine Oil Level","required":true,"section":"Engine","condition":4},{"id":"a1","title":"Check Air Filter","required":true,"section":"Air System","condition":5},{"id":"s1","title":"Safety Valve Operation","required":true,"section":"Safety","condition":4},{"id":"p1","title":"CFM Output Test","required":true,"section":"Performance","condition":3}]'::jsonb,
    '500-hr PM. Oil leaks at head gasket need attention at next service.',
    2856.0,
    '2025-07-14 08:00:00+00', '2025-07-20 15:00:00+00'
  ),

  -- ===========================================
  -- Tom's Field Services PMs
  -- ===========================================

  -- C12: Doosan P185 — CURRENT (2345 − 2045 = 300 < 400)
  (
    'dd0e8400-e29b-41d4-a716-446655440031'::uuid,
    'a00e8400-e29b-41d4-a716-446655440131'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440090'::uuid,
    '660e8400-e29b-41d4-a716-446655440005'::uuid,
    'cc0e8400-e29b-41d4-a716-446655440003'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    '2025-12-10 14:00:00+00',
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'Tom Technician', 'Tom Technician',
    'completed',
    '[{"id":"v1","title":"Check for Oil/Air Leaks","required":true,"section":"Visual Inspection","condition":4},{"id":"e1","title":"Check Engine Oil Level","required":true,"section":"Engine","condition":5},{"id":"a1","title":"Check Air Filter","required":true,"section":"Air System","condition":5},{"id":"s1","title":"Safety Valve Operation","required":true,"section":"Safety","condition":5},{"id":"p1","title":"CFM Output Test","required":true,"section":"Performance","condition":4}]'::jsonb,
    '500-hr runtime PM. Unit in excellent condition.',
    2045.0,
    '2025-12-03 08:00:00+00', '2025-12-10 14:00:00+00'
  ),

  -- C13: Vermeer S800TX — DUE SOON (567.5 − 407.5 = 160, 80% of 200)
  (
    'dd0e8400-e29b-41d4-a716-446655440032'::uuid,
    'a00e8400-e29b-41d4-a716-446655440132'::uuid,
    'aa0e8400-e29b-41d4-a716-446655440091'::uuid,
    '660e8400-e29b-41d4-a716-446655440005'::uuid,
    'cc0e8400-e29b-41d4-a716-446655440006'::uuid,
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
    '2026-01-15 14:00:00+00',
    'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'Tom Technician', 'Tom Technician',
    'completed',
    '[{"id":"v1","title":"External Inspection","required":true,"section":"Visual Inspection","condition":4},{"id":"e1","title":"Engine Oil & Filter","required":true,"section":"Engine","condition":5},{"id":"h1","title":"Hydraulic Fluid & Filters","required":true,"section":"Hydraulic","condition":4},{"id":"d1","title":"Drive Chain/Belt Tension","required":true,"section":"Drive System","condition":4},{"id":"s1","title":"ROPS & Safety Devices","required":true,"section":"Safety","condition":5}]'::jsonb,
    '200-hr Skid Steer PM. Drive belt slightly worn — monitor.',
    407.5,
    '2026-01-08 08:00:00+00', '2026-01-15 14:00:00+00'
  )

ON CONFLICT (id) DO NOTHING;


-- =====================================================
-- SECTION 5: PM Status History
-- =====================================================
-- UUID prefix: ee0e8400-e29b-41d4-a716-446655440XXX
-- One final-transition entry per PM record.

INSERT INTO public.pm_status_history (
  id, pm_id, old_status, new_status, changed_by, changed_at, reason
) VALUES
  -- Apex
  ('ee0e8400-e29b-41d4-a716-446655440001'::uuid, 'dd0e8400-e29b-41d4-a716-446655440001'::uuid, 'in_progress', 'completed', 'bb0e8400-e29b-41d4-a716-446655440003'::uuid, '2025-09-12 16:00:00+00', NULL),
  ('ee0e8400-e29b-41d4-a716-446655440002'::uuid, 'dd0e8400-e29b-41d4-a716-446655440002'::uuid, 'in_progress', 'completed', 'bb0e8400-e29b-41d4-a716-446655440003'::uuid, '2026-01-10 16:00:00+00', NULL),
  ('ee0e8400-e29b-41d4-a716-446655440003'::uuid, 'dd0e8400-e29b-41d4-a716-446655440003'::uuid, 'in_progress', 'completed', 'bb0e8400-e29b-41d4-a716-446655440003'::uuid, '2026-02-15 15:00:00+00', NULL),
  ('ee0e8400-e29b-41d4-a716-446655440004'::uuid, 'dd0e8400-e29b-41d4-a716-446655440004'::uuid, 'in_progress', 'completed', 'bb0e8400-e29b-41d4-a716-446655440003'::uuid, '2026-01-20 14:00:00+00', NULL),
  -- Metro
  ('ee0e8400-e29b-41d4-a716-446655440010'::uuid, 'dd0e8400-e29b-41d4-a716-446655440010'::uuid, 'in_progress', 'completed', 'bb0e8400-e29b-41d4-a716-446655440005'::uuid, '2025-11-08 15:00:00+00', NULL),
  ('ee0e8400-e29b-41d4-a716-446655440011'::uuid, 'dd0e8400-e29b-41d4-a716-446655440011'::uuid, 'in_progress', 'completed', 'bb0e8400-e29b-41d4-a716-446655440005'::uuid, '2026-02-20 16:00:00+00', NULL),
  ('ee0e8400-e29b-41d4-a716-446655440012'::uuid, 'dd0e8400-e29b-41d4-a716-446655440012'::uuid, 'in_progress', 'completed', 'bb0e8400-e29b-41d4-a716-446655440005'::uuid, '2025-08-27 16:00:00+00', NULL),
  ('ee0e8400-e29b-41d4-a716-446655440013'::uuid, 'dd0e8400-e29b-41d4-a716-446655440013'::uuid, 'in_progress', 'completed', 'bb0e8400-e29b-41d4-a716-446655440005'::uuid, '2025-10-17 15:00:00+00', NULL),
  ('ee0e8400-e29b-41d4-a716-446655440014'::uuid, 'dd0e8400-e29b-41d4-a716-446655440014'::uuid, 'pending',     'in_progress', 'bb0e8400-e29b-41d4-a716-446655440005'::uuid, '2026-03-12 10:00:00+00', NULL),
  -- Industrial
  ('ee0e8400-e29b-41d4-a716-446655440020'::uuid, 'dd0e8400-e29b-41d4-a716-446655440020'::uuid, 'in_progress', 'completed', 'bb0e8400-e29b-41d4-a716-446655440008'::uuid, '2025-09-01 15:00:00+00', NULL),
  ('ee0e8400-e29b-41d4-a716-446655440021'::uuid, 'dd0e8400-e29b-41d4-a716-446655440021'::uuid, 'in_progress', 'completed', 'bb0e8400-e29b-41d4-a716-446655440008'::uuid, '2025-12-05 16:00:00+00', NULL),
  ('ee0e8400-e29b-41d4-a716-446655440022'::uuid, 'dd0e8400-e29b-41d4-a716-446655440022'::uuid, 'in_progress', 'completed', 'bb0e8400-e29b-41d4-a716-446655440008'::uuid, '2026-01-29 15:00:00+00', NULL),
  ('ee0e8400-e29b-41d4-a716-446655440023'::uuid, 'dd0e8400-e29b-41d4-a716-446655440023'::uuid, 'in_progress', 'completed', 'bb0e8400-e29b-41d4-a716-446655440008'::uuid, '2025-12-30 14:00:00+00', NULL),
  ('ee0e8400-e29b-41d4-a716-446655440024'::uuid, 'dd0e8400-e29b-41d4-a716-446655440024'::uuid, 'in_progress', 'completed', 'bb0e8400-e29b-41d4-a716-446655440004'::uuid, '2025-06-15 14:00:00+00', NULL),
  ('ee0e8400-e29b-41d4-a716-446655440025'::uuid, 'dd0e8400-e29b-41d4-a716-446655440025'::uuid, 'in_progress', 'completed', 'bb0e8400-e29b-41d4-a716-446655440008'::uuid, '2025-08-15 16:00:00+00', NULL),
  -- Mike's
  ('ee0e8400-e29b-41d4-a716-446655440030'::uuid, 'dd0e8400-e29b-41d4-a716-446655440030'::uuid, 'in_progress', 'completed', 'bb0e8400-e29b-41d4-a716-446655440005'::uuid, '2025-07-20 15:00:00+00', NULL),
  -- Tom's
  ('ee0e8400-e29b-41d4-a716-446655440031'::uuid, 'dd0e8400-e29b-41d4-a716-446655440031'::uuid, 'in_progress', 'completed', 'bb0e8400-e29b-41d4-a716-446655440003'::uuid, '2025-12-10 14:00:00+00', NULL),
  ('ee0e8400-e29b-41d4-a716-446655440032'::uuid, 'dd0e8400-e29b-41d4-a716-446655440032'::uuid, 'in_progress', 'completed', 'bb0e8400-e29b-41d4-a716-446655440003'::uuid, '2026-01-15 14:00:00+00', NULL)
ON CONFLICT (id) DO NOTHING;
