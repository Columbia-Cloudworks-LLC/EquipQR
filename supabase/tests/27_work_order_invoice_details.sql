BEGIN;
SELECT plan(22);

-- Invoice dates are explicit business input; audit clocks must never fill them.
INSERT INTO auth.users (id, email, raw_user_meta_data)
SELECT ('27000000-0000-0000-0000-00000000000' || n)::uuid,
       'invoice-details-' || n || '@equipqr.test', '{"name":"Invoice test"}'::jsonb
FROM generate_series(1, 5) n;

INSERT INTO public.organizations (id, name) VALUES
  ('27000000-aaaa-0000-0000-000000000001', 'Invoice organization A'),
  ('27000000-aaaa-0000-0000-000000000002', 'Invoice organization B');
INSERT INTO public.organization_members (organization_id, user_id, role, status, can_manage_quickbooks) VALUES
  ('27000000-aaaa-0000-0000-000000000001', '27000000-0000-0000-0000-000000000001', 'owner', 'active', false),
  ('27000000-aaaa-0000-0000-000000000001', '27000000-0000-0000-0000-000000000002', 'admin', 'active', true),
  ('27000000-aaaa-0000-0000-000000000001', '27000000-0000-0000-0000-000000000003', 'admin', 'active', false),
  ('27000000-aaaa-0000-0000-000000000001', '27000000-0000-0000-0000-000000000004', 'member', 'active', true),
  ('27000000-aaaa-0000-0000-000000000002', '27000000-0000-0000-0000-000000000005', 'owner', 'active', false);
INSERT INTO public.equipment (id, organization_id, name, manufacturer, model, serial_number, status, location, installation_date) VALUES
  ('27000000-cccc-0000-0000-000000000001', '27000000-aaaa-0000-0000-000000000001', 'Invoice equipment', 'Test', 'Test', 'INVOICE-TEST', 'active', 'Test', '2020-01-01');
INSERT INTO public.work_orders (id, organization_id, equipment_id, title, description, created_by, status, priority)
SELECT ('27000000-dddd-0000-0000-00000000000' || n)::uuid,
       '27000000-aaaa-0000-0000-000000000001', '27000000-cccc-0000-0000-000000000001',
       'Invoice work order', 'Invoice test work', '27000000-0000-0000-0000-000000000001', 'submitted', 'medium'
FROM generate_series(1, 2) n;

SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO '27000000-0000-0000-0000-000000000001';
SELECT lives_ok($$INSERT INTO public.work_order_invoice_details (work_order_id, organization_id)
  VALUES ('27000000-dddd-0000-0000-000000000001', '27000000-aaaa-0000-0000-000000000001')$$,
  'owner may save incomplete billing input');
SELECT ok((SELECT invoice_date IS NULL AND due_date IS NULL AND payment_term_id IS NULL
  AND service_dates = '{}'::jsonb AND qb_line_ids = '{}'::jsonb
  FROM public.work_order_invoice_details WHERE work_order_id = '27000000-dddd-0000-0000-000000000001'),
  'new billing input has no clock-derived business dates');
SELECT lives_ok($$UPDATE public.work_order_invoice_details
  SET invoice_date = '2024-02-29', due_date = '2024-03-30', payment_term_id = '3',
      service_dates = '{"labor":"2024-02-01"}'
  WHERE work_order_id = '27000000-dddd-0000-0000-000000000001'$$,
  'owner may explicitly save historical billing and service dates');
SELECT lives_ok($$INSERT INTO public.work_order_invoice_details (work_order_id, organization_id, invoice_date)
  VALUES ('27000000-dddd-0000-0000-000000000001', '27000000-aaaa-0000-0000-000000000001', '2024-02-29')
  ON CONFLICT (work_order_id) DO UPDATE SET work_order_id = EXCLUDED.work_order_id,
    organization_id = EXCLUDED.organization_id, invoice_date = EXCLUDED.invoice_date$$,
  'client upsert can include unchanged identity columns');
SELECT throws_ok($$UPDATE public.work_order_invoice_details SET work_order_id = '27000000-dddd-0000-0000-000000000002'
  WHERE work_order_id = '27000000-dddd-0000-0000-000000000001'$$, '23514', NULL,
  'client cannot transfer server mapping to another work order');
SELECT throws_ok($$UPDATE public.work_order_invoice_details SET qb_line_ids = '{"labor":"1"}'
  WHERE work_order_id = '27000000-dddd-0000-0000-000000000001'$$, '42501', NULL,
  'authenticated owner cannot change server invoice line mapping');
SELECT throws_ok($$INSERT INTO public.work_order_invoice_details (work_order_id, organization_id, qb_line_ids)
  VALUES ('27000000-dddd-0000-0000-000000000002', '27000000-aaaa-0000-0000-000000000001', '{"labor":"1"}')$$,
  '42501', NULL, 'authenticated owner cannot insert server line mapping');
SELECT throws_ok($$DELETE FROM public.work_order_invoice_details
  WHERE work_order_id = '27000000-dddd-0000-0000-000000000001'$$, '42501', NULL,
  'client cannot delete invoice line identity');

SET LOCAL request.jwt.claim.sub TO '27000000-0000-0000-0000-000000000002';
SELECT is((SELECT count(*)::int FROM public.work_order_invoice_details), 1, 'QuickBooks admin can read billing input');
SELECT lives_ok($$UPDATE public.work_order_invoice_details SET due_date = '2024-04-01'
  WHERE work_order_id = '27000000-dddd-0000-0000-000000000001'$$, 'QuickBooks admin can edit billing input');
SELECT is((SELECT due_date::text FROM public.work_order_invoice_details), '2024-04-01', 'admin update persisted');

SET LOCAL request.jwt.claim.sub TO '27000000-0000-0000-0000-000000000003';
SELECT is((SELECT count(*)::int FROM public.work_order_invoice_details), 0, 'admin without QuickBooks permission cannot read');
SELECT throws_ok($$INSERT INTO public.work_order_invoice_details (work_order_id, organization_id)
  VALUES ('27000000-dddd-0000-0000-000000000002', '27000000-aaaa-0000-0000-000000000001')$$,
  '42501', NULL, 'admin without QuickBooks permission cannot insert');

SET LOCAL request.jwt.claim.sub TO '27000000-0000-0000-0000-000000000004';
SELECT is((SELECT count(*)::int FROM public.work_order_invoice_details), 0, 'ordinary member cannot read even with QuickBooks flag');
SET LOCAL request.jwt.claim.sub TO '27000000-0000-0000-0000-000000000005';
SELECT is((SELECT count(*)::int FROM public.work_order_invoice_details), 0, 'other organization owner cannot read');
SELECT throws_ok($$INSERT INTO public.work_order_invoice_details (work_order_id, organization_id)
  VALUES ('27000000-dddd-0000-0000-000000000002', '27000000-aaaa-0000-0000-000000000002')$$,
  '23503', NULL, 'cannot attach another organizations work order to own organization');

SET LOCAL role TO anon;
SELECT throws_ok($$SELECT * FROM public.work_order_invoice_details$$, '42501', NULL, 'anonymous cannot read billing input');
SET LOCAL role TO service_role;
SELECT lives_ok($$UPDATE public.work_order_invoice_details SET qb_line_ids = '{"labor":"1"}'
  WHERE work_order_id = '27000000-dddd-0000-0000-000000000001'$$, 'server may persist invoice line identity');
SELECT is((SELECT qb_line_ids->>'labor' FROM public.work_order_invoice_details), '1', 'server line mapping persisted');
SELECT throws_ok($$UPDATE public.work_order_invoice_details SET service_dates = '[]'
  WHERE work_order_id = '27000000-dddd-0000-0000-000000000001'$$, '23514', NULL, 'service dates must be an object');
SELECT throws_ok($$UPDATE public.work_order_invoice_details SET organization_id = '27000000-aaaa-0000-0000-000000000002'
  WHERE work_order_id = '27000000-dddd-0000-0000-000000000001'$$, '23514', NULL, 'tenant identity is immutable for server writes too');
RESET role;
DELETE FROM public.work_orders WHERE id = '27000000-dddd-0000-0000-000000000001';
SELECT is((SELECT count(*)::int FROM public.work_order_invoice_details), 0, 'deleting work order cascades billing input');
SELECT * FROM finish();
ROLLBACK;
