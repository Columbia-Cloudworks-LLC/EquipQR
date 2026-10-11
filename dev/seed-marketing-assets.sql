-- Seed script for Marketing Screenshots
-- Real equipment, field technicians, realistic work orders, PM inspections, and QuickBooks sync.

BEGIN;

-- 1. Realistic Field Technicians in Profiles & Teams
UPDATE public.profiles
SET name = 'Jake M.'
WHERE id = 'bb0e8400-e29b-41d4-a716-446655440003';

UPDATE public.profiles
SET name = 'Cody Vance'
WHERE id = 'bb0e8400-e29b-41d4-a716-446655440002';

UPDATE public.profiles
SET name = 'Sarah T.'
WHERE id = 'bb0e8400-e29b-41d4-a716-446655440001';

-- 2. Heavy Equipment Fleet Team & Memberships
INSERT INTO public.teams (
  id,
  organization_id,
  name,
  description
) VALUES (
  'e10e8400-e29b-41d4-a716-446655440001'::uuid,
  '660e8400-e29b-41d4-a716-446655440000'::uuid,
  'Heavy Equipment Fleet',
  'Primary heavy machinery: excavators, track loaders, and wheel loaders'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

INSERT INTO public.team_members (
  id,
  team_id,
  user_id,
  role
) VALUES
  ('880e8400-e29b-41d4-a716-446655440021'::uuid, 'e10e8400-e29b-41d4-a716-446655440001'::uuid, 'bb0e8400-e29b-41d4-a716-446655440001'::uuid, 'manager'),
  ('880e8400-e29b-41d4-a716-446655440022'::uuid, 'e10e8400-e29b-41d4-a716-446655440001'::uuid, 'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'technician')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quickbooks_team_customers (
  organization_id,
  team_id,
  quickbooks_customer_id,
  display_name
) VALUES (
  '660e8400-e29b-41d4-a716-446655440000'::uuid,
  'e10e8400-e29b-41d4-a716-446655440001'::uuid,
  '1042',
  'Apex Heavy Equipment Operations'
)
ON CONFLICT (organization_id, team_id) DO UPDATE SET
  quickbooks_customer_id = EXCLUDED.quickbooks_customer_id,
  display_name = EXCLUDED.display_name;

-- 3. Authentic Heavy Equipment in Apex Construction (660e8400-e29b-41d4-a716-446655440000)
-- Unit #EX-104: CAT 320 GC Excavator (Status: In Shop / maintenance)
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
  image_url,
  default_pm_template_id,
  last_maintenance,
  created_at,
  updated_at
) VALUES (
  'aa0e8400-e29b-41d4-a716-44665544a104'::uuid,
  '660e8400-e29b-41d4-a716-446655440000'::uuid,
  'e10e8400-e29b-41d4-a716-446655440001'::uuid,
  'CAT 320 GC Excavator',
  'Caterpillar',
  '320 GC',
  'CAT0320GX9821',
  'maintenance',
  'Bay 3 - South Shop',
  '2023-03-15',
  2840.0,
  '{"unit_number": "EX-104", "qr_tag": "EQR-EX104"}'::jsonb,
  '/images/landing/stock/equipment-yard-1200.webp',
  'cc0e8400-e29b-41d4-a716-446655440005'::uuid,
  (now() - interval '2 days')::date,
  now() - interval '180 days',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  manufacturer = EXCLUDED.manufacturer,
  model = EXCLUDED.model,
  serial_number = EXCLUDED.serial_number,
  status = EXCLUDED.status,
  location = EXCLUDED.location,
  working_hours = EXCLUDED.working_hours,
  custom_attributes = EXCLUDED.custom_attributes,
  image_url = EXCLUDED.image_url,
  default_pm_template_id = EXCLUDED.default_pm_template_id,
  last_maintenance = EXCLUDED.last_maintenance,
  updated_at = now();

-- Unit #TL-012: Bobcat T770 Track Loader (Status: Field Ready / active)
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
  image_url,
  default_pm_template_id,
  last_maintenance,
  created_at,
  updated_at
) VALUES (
  'aa0e8400-e29b-41d4-a716-44665544a012'::uuid,
  '660e8400-e29b-41d4-a716-446655440000'::uuid,
  'e10e8400-e29b-41d4-a716-446655440001'::uuid,
  'Bobcat T770 Track Loader',
  'Bobcat',
  'T770',
  'BOBT7702024012',
  'active',
  'Staging Yard B',
  '2024-01-10',
  865.0,
  '{"unit_number": "TL-012", "qr_tag": "EQR-TL012"}'::jsonb,
  '/images/landing/stock/workshop-tools-1200.webp',
  'cc0e8400-e29b-41d4-a716-446655440006'::uuid,
  (now() - interval '14 days')::date,
  now() - interval '90 days',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  manufacturer = EXCLUDED.manufacturer,
  model = EXCLUDED.model,
  serial_number = EXCLUDED.serial_number,
  status = EXCLUDED.status,
  location = EXCLUDED.location,
  working_hours = EXCLUDED.working_hours,
  custom_attributes = EXCLUDED.custom_attributes,
  image_url = EXCLUDED.image_url,
  default_pm_template_id = EXCLUDED.default_pm_template_id,
  last_maintenance = EXCLUDED.last_maintenance,
  updated_at = now();

-- Unit #WL-203: Komatsu WA380-8 Wheel Loader (Status: active, PM Due)
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
  image_url,
  default_pm_template_id,
  last_maintenance,
  created_at,
  updated_at
) VALUES (
  'aa0e8400-e29b-41d4-a716-44665544a203'::uuid,
  '660e8400-e29b-41d4-a716-446655440000'::uuid,
  'e10e8400-e29b-41d4-a716-446655440001'::uuid,
  'Komatsu WA380-8 Wheel Loader',
  'Komatsu',
  'WA380-8',
  'KMTWA3802023203',
  'active',
  'Customer Jobsite (Oak Creek)',
  '2022-08-20',
  4120.0,
  '{"unit_number": "WL-203", "qr_tag": "EQR-WL203"}'::jsonb,
  '/images/landing/stock/equipment-yard-640.webp',
  'cc0e8400-e29b-41d4-a716-446655440005'::uuid,
  (now() - interval '75 days')::date,
  now() - interval '300 days',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  manufacturer = EXCLUDED.manufacturer,
  model = EXCLUDED.model,
  serial_number = EXCLUDED.serial_number,
  status = EXCLUDED.status,
  location = EXCLUDED.location,
  working_hours = EXCLUDED.working_hours,
  custom_attributes = EXCLUDED.custom_attributes,
  image_url = EXCLUDED.image_url,
  default_pm_template_id = EXCLUDED.default_pm_template_id,
  last_maintenance = EXCLUDED.last_maintenance,
  updated_at = now();

-- Ensure Komatsu WA380-8 has an overdue PM policy
INSERT INTO public.pm_interval_policies (
  id,
  organization_id,
  scope_type,
  equipment_id,
  pm_template_id,
  policy_slot,
  schedule_mode,
  interval_value,
  interval_type,
  created_by
) VALUES (
  'ee0e8400-e29b-41d4-a716-44665544a203'::uuid,
  '660e8400-e29b-41d4-a716-446655440000'::uuid,
  'equipment',
  'aa0e8400-e29b-41d4-a716-44665544a203'::uuid,
  NULL,
  'primary',
  'custom',
  30,
  'days',
  'bb0e8400-e29b-41d4-a716-446655440001'::uuid
)
ON CONFLICT (id) DO UPDATE SET
  interval_value = 30,
  interval_type = 'days';

-- 3. Scans for Authentic Timeline Context
INSERT INTO public.scans (
  id,
  equipment_id,
  scanned_by,
  scanned_by_name,
  scanned_at,
  location
) VALUES
  ('110e8400-e29b-41d4-a716-446655440001'::uuid, 'aa0e8400-e29b-41d4-a716-44665544a104'::uuid, 'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'Jake M.', now() - interval '18 minutes', 'Bay 3 - South Shop'),
  ('110e8400-e29b-41d4-a716-446655440002'::uuid, 'aa0e8400-e29b-41d4-a716-44665544a012'::uuid, 'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'Jake M.', now() - interval '2 hours', 'Staging Yard B'),
  ('110e8400-e29b-41d4-a716-446655440003'::uuid, 'aa0e8400-e29b-41d4-a716-44665544a203'::uuid, 'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'Jake M.', now() - interval '4 hours', 'Customer Jobsite (Oak Creek)')
ON CONFLICT (id) DO UPDATE SET
  location = EXCLUDED.location,
  scanned_at = EXCLUDED.scanned_at;

-- 4. Closed Work Order (View 1 & View 3)
-- "500hr Hydraulic Filter & Fluid Service - Completed 2d ago by Jake M."
-- Exported to QuickBooks (Draft Invoice #1042, Synced)
INSERT INTO public.work_orders (
  id,
  organization_id,
  equipment_id,
  team_id,
  title,
  description,
  status,
  priority,
  assignee_id,
  assignee_name,
  created_by,
  created_by_name,
  created_date,
  completed_date,
  quickbooks_invoice_id,
  quickbooks_invoice_number,
  invoice_status,
  invoice_last_synced_at,
  quickbooks_invoice_environment,
  has_pm,
  pm_required
) VALUES (
  'dd0e8400-e29b-41d4-a716-44665544a101'::uuid,
  '660e8400-e29b-41d4-a716-446655440000'::uuid,
  'aa0e8400-e29b-41d4-a716-44665544a104'::uuid,
  'e10e8400-e29b-41d4-a716-446655440001'::uuid,
  '500hr Hydraulic Filter & Fluid Service',
  'Scheduled 500-hour hydraulic service. Drained reservoir, replaced high-pressure and case-drain filters, replenished fluid, and performed pressure relief check.',
  'completed',
  'medium',
  'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
  'Jake M.',
  'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
  'Alex Apex',
  now() - interval '3 days',
  now() - interval '2 days',
  '1042',
  '1042',
  'draft',
  now() - interval '2 days',
  'sandbox',
  true,
  false
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  status = EXCLUDED.status,
  assignee_id = EXCLUDED.assignee_id,
  assignee_name = EXCLUDED.assignee_name,
  completed_date = EXCLUDED.completed_date,
  quickbooks_invoice_id = EXCLUDED.quickbooks_invoice_id,
  quickbooks_invoice_number = EXCLUDED.quickbooks_invoice_number,
  invoice_status = EXCLUDED.invoice_status,
  invoice_last_synced_at = EXCLUDED.invoice_last_synced_at,
  quickbooks_invoice_environment = EXCLUDED.quickbooks_invoice_environment;

-- Junction equipment link
INSERT INTO public.work_order_equipment (
  id,
  work_order_id,
  equipment_id,
  is_primary
) VALUES (
  'dd0e8400-e29b-41d4-a716-44665544e101'::uuid,
  'dd0e8400-e29b-41d4-a716-44665544a101'::uuid,
  'aa0e8400-e29b-41d4-a716-44665544a104'::uuid,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Costs for Closed Work Order:
-- Labor: 4.5 hrs, Parts: Hydraulic seal kit & 15W-40 oil
DELETE FROM public.work_order_costs WHERE work_order_id = 'dd0e8400-e29b-41d4-a716-44665544a101'::uuid;

INSERT INTO public.work_order_costs (
  id,
  work_order_id,
  description,
  quantity,
  unit_price_cents,
  created_by,
  created_by_name
) VALUES
  ('cc0e8400-e29b-41d4-a716-44665544c001'::uuid, 'dd0e8400-e29b-41d4-a716-44665544a101'::uuid, 'Labor: 4.5 hrs', 4.5, 9500, 'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'Jake M.'),
  ('cc0e8400-e29b-41d4-a716-44665544c002'::uuid, 'dd0e8400-e29b-41d4-a716-44665544a101'::uuid, 'Hydraulic seal kit', 1, 18500, 'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'Jake M.'),
  ('cc0e8400-e29b-41d4-a716-44665544c003'::uuid, 'dd0e8400-e29b-41d4-a716-44665544a101'::uuid, '15W-40 oil (gal)', 5, 2800, 'bb0e8400-e29b-41d4-a716-446655440003'::uuid, 'Jake M.');

-- 5. QuickBooks Credentials & Export Log for Sync presentation
INSERT INTO public.quickbooks_credentials (
  organization_id,
  realm_id,
  access_token,
  refresh_token,
  access_token_expires_at,
  refresh_token_expires_at,
  scopes
) VALUES (
  '660e8400-e29b-41d4-a716-446655440000'::uuid,
  '9341453965823412',
  'eyJsYXRlbnQiOiJkZW1vX3Fib19hdXRoX3Rva2VuIn0',
  'dGVzdF9xYm9fcmVmcmVzaF90b2tlbg',
  now() + interval '30 days',
  now() + interval '180 days',
  'com.intuit.quickbooks.accounting'
)
ON CONFLICT (organization_id, realm_id) DO UPDATE SET
  access_token_expires_at = now() + interval '30 days';

INSERT INTO public.quickbooks_team_customers (
  organization_id,
  team_id,
  quickbooks_customer_id,
  display_name
) VALUES (
  '660e8400-e29b-41d4-a716-446655440000'::uuid,
  '880e8400-e29b-41d4-a716-446655440000'::uuid,
  '1042',
  'Apex Heavy Equipment Operations'
)
ON CONFLICT (organization_id, team_id) DO UPDATE SET
  quickbooks_customer_id = EXCLUDED.quickbooks_customer_id,
  display_name = EXCLUDED.display_name;

INSERT INTO public.quickbooks_export_logs (
  id,
  organization_id,
  work_order_id,
  realm_id,
  quickbooks_invoice_id,
  quickbooks_invoice_number,
  quickbooks_environment,
  status,
  exported_at
) VALUES (
  'bb0e8400-e29b-41d4-a716-44665544e042'::uuid,
  '660e8400-e29b-41d4-a716-446655440000'::uuid,
  'dd0e8400-e29b-41d4-a716-44665544a101'::uuid,
  '9341453965823412',
  '1042',
  '1042',
  'sandbox',
  'success',
  now() - interval '2 days'
)
ON CONFLICT (id) DO UPDATE SET
  quickbooks_invoice_id = '1042',
  quickbooks_invoice_number = '1042',
  status = 'success';

-- 6. Active Work Order with PM Checklist (View 2)
-- What must be visible:
-- A PM checklist showing completed checks:
-- "Engine Oil Level - PASS"
-- "Track Tension - ADJUSTED"
-- "Hydraulic Cylinder Inspection - 1 Defect Noted with attached photo thumbnail"
INSERT INTO public.work_orders (
  id,
  organization_id,
  equipment_id,
  team_id,
  title,
  description,
  status,
  priority,
  assignee_id,
  assignee_name,
  created_by,
  created_by_name,
  created_date,
  has_pm,
  pm_required
) VALUES (
  'dd0e8400-e29b-41d4-a716-44665544a102'::uuid,
  '660e8400-e29b-41d4-a716-446655440000'::uuid,
  'aa0e8400-e29b-41d4-a716-44665544a104'::uuid,
  'e10e8400-e29b-41d4-a716-446655440001'::uuid,
  'Pre-Shift PM & Hydraulic Inspection',
  'Tactile walk-around inspection and hydraulic system checklist on CAT 320 GC.',
  'in_progress',
  'high',
  'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
  'Jake M.',
  'bb0e8400-e29b-41d4-a716-446655440001'::uuid,
  'Alex Apex',
  now() - interval '4 hours',
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  status = EXCLUDED.status,
  assignee_id = EXCLUDED.assignee_id,
  assignee_name = EXCLUDED.assignee_name,
  has_pm = true;

INSERT INTO public.work_order_equipment (
  id,
  work_order_id,
  equipment_id,
  is_primary
) VALUES (
  'dd0e8400-e29b-41d4-a716-44665544e102'::uuid,
  'dd0e8400-e29b-41d4-a716-44665544a102'::uuid,
  'aa0e8400-e29b-41d4-a716-44665544a104'::uuid,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Active PM Inspection Record with the 3 highlighted items
DELETE FROM public.preventative_maintenance WHERE work_order_id = 'dd0e8400-e29b-41d4-a716-44665544a102'::uuid;

INSERT INTO public.preventative_maintenance (
  id,
  organization_id,
  work_order_id,
  equipment_id,
  template_id,
  status,
  created_by,
  created_by_name,
  checklist_data
) VALUES (
  'aa0e8400-e29b-41d4-a716-44665544c102'::uuid,
  '660e8400-e29b-41d4-a716-446655440000'::uuid,
  'dd0e8400-e29b-41d4-a716-44665544a102'::uuid,
  'aa0e8400-e29b-41d4-a716-44665544a104'::uuid,
  'cc0e8400-e29b-41d4-a716-446655440005'::uuid,
  'in_progress',
  'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
  'Jake M.',
  '[
    {
      "id": "pm-item-1",
      "title": "Engine Oil Level - PASS",
      "section": "Walk-Around Inspection",
      "condition": 1,
      "required": true,
      "notes": "Checked cold; level at upper hashmark. Oil viscosity clean."
    },
    {
      "id": "pm-item-2",
      "title": "Track Tension - ADJUSTED",
      "section": "Walk-Around Inspection",
      "condition": 2,
      "required": true,
      "notes": "Greased track adjuster tension cylinder; sag set to factory 45mm."
    },
    {
      "id": "pm-item-3",
      "title": "Hydraulic Cylinder Inspection - 1 Defect Noted",
      "section": "Walk-Around Inspection",
      "condition": 3,
      "required": true,
      "photo_url": "/images/landing/stock/workshop-tools-640.webp",
      "notes": "Defect: Pitted rod on bucket cylinder gland seal weeping fluid. Photo attached."
    }
  ]'::jsonb
);

-- Note with defect photo thumbnail for Active Work Order
DELETE FROM public.work_order_notes WHERE work_order_id = 'dd0e8400-e29b-41d4-a716-44665544a102'::uuid;

INSERT INTO public.work_order_notes (
  id,
  work_order_id,
  author_id,
  author_name,
  content,
  is_private,
  created_at
) VALUES (
  '880e8400-e29b-41d4-a716-44665544b102'::uuid,
  'dd0e8400-e29b-41d4-a716-44665544a102'::uuid,
  'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
  'Jake M.',
  'Hydraulic Cylinder Inspection: Found minor fluid weep at bucket cylinder rod gland wiper seal. Seal kit SK-CAT-320 staged in Bay 3.',
  false,
  now() - interval '2 hours'
);

INSERT INTO public.work_order_images (
  id,
  work_order_id,
  note_id,
  file_url,
  file_name,
  uploaded_by,
  uploaded_by_name
) VALUES (
  '990e8400-e29b-41d4-a716-44665544c102'::uuid,
  'dd0e8400-e29b-41d4-a716-44665544a102'::uuid,
  '880e8400-e29b-41d4-a716-44665544b102'::uuid,
  '/images/landing/stock/workshop-tools-640.webp',
  'bucket-cylinder-gland-defect.webp',
  'bb0e8400-e29b-41d4-a716-446655440003'::uuid,
  'Jake M.'
)
ON CONFLICT (id) DO UPDATE SET
  file_url = EXCLUDED.file_url;

COMMIT;
