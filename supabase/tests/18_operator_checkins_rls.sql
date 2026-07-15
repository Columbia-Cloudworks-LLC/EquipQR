BEGIN;
SELECT plan(35);

-- ============================================
-- Test: operator check-in domain RLS (#1091)
-- ============================================

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '31000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'opcheck-user1@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "OpCheck User1"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '31000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'opcheck-user2@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "OpCheck User2"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO organizations (id, name, plan, member_count, max_members)
VALUES
  ('31000000-aaaa-0000-0000-000000000001'::uuid, 'OpCheck Org A', 'free', 2, 10),
  ('31000000-aaaa-0000-0000-000000000002'::uuid, 'OpCheck Org B', 'free', 1, 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO organization_members (user_id, organization_id, role, status, joined_date)
VALUES
  ('31000000-0000-0000-0000-000000000001'::uuid, '31000000-aaaa-0000-0000-000000000001'::uuid, 'owner', 'active', NOW()),
  ('31000000-0000-0000-0000-000000000002'::uuid, '31000000-aaaa-0000-0000-000000000002'::uuid, 'owner', 'active', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO public.equipment (id, organization_id, name, manufacturer, model, serial_number, status, location, installation_date)
VALUES
  ('31000000-bbbb-0000-0000-000000000001'::uuid, '31000000-aaaa-0000-0000-000000000001'::uuid, 'Truck 101', 'Ford', 'F550', 'SN-OC-001', 'active', 'Yard A', CURRENT_DATE),
  ('31000000-bbbb-0000-0000-000000000002'::uuid, '31000000-aaaa-0000-0000-000000000002'::uuid, 'Truck 202', 'Ford', 'F550', 'SN-OC-002', 'active', 'Yard B', CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.operator_checklist_templates (id, organization_id, name, template_data, created_by)
VALUES
  ('31000000-cccc-0000-0000-000000000001'::uuid, '31000000-aaaa-0000-0000-000000000001'::uuid, 'Daily Truck Check', '{"checklistItems":[{"id":"i1","title":"Brakes","required":true,"section":"Safety"}],"dataFields":[{"id":"f1","label":"Your name","source":"operator_input","inputType":"text","required":true}]}'::jsonb, '31000000-0000-0000-0000-000000000001'::uuid),
  ('31000000-cccc-0000-0000-000000000003'::uuid, '31000000-aaaa-0000-0000-000000000001'::uuid, 'Odometer Log', '{"checklistItems":[],"dataFields":[{"id":"f2","label":"Odometer","source":"operator_input","inputType":"number","required":true}]}'::jsonb, '31000000-0000-0000-0000-000000000001'::uuid),
  ('31000000-cccc-0000-0000-000000000004'::uuid, '31000000-aaaa-0000-0000-000000000001'::uuid, 'Purge Guard Template', '{"checklistItems":[],"dataFields":[]}'::jsonb, '31000000-0000-0000-0000-000000000001'::uuid),
  ('31000000-cccc-0000-0000-000000000002'::uuid, '31000000-aaaa-0000-0000-000000000002'::uuid, 'Org B Template', '{"checklistItems":[],"dataFields":[]}'::jsonb, '31000000-0000-0000-0000-000000000002'::uuid)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.equipment_operator_checkin_settings (id, organization_id, equipment_id, template_id, enabled, public_token_hash)
VALUES
  ('31000000-dddd-0000-0000-000000000001'::uuid, '31000000-aaaa-0000-0000-000000000001'::uuid, '31000000-bbbb-0000-0000-000000000001'::uuid, '31000000-cccc-0000-0000-000000000001'::uuid, true, encode(digest('test-token-a', 'sha256'), 'hex')),
  ('31000000-dddd-0000-0000-000000000003'::uuid, '31000000-aaaa-0000-0000-000000000001'::uuid, '31000000-bbbb-0000-0000-000000000001'::uuid, '31000000-cccc-0000-0000-000000000003'::uuid, true, encode(digest('test-token-c', 'sha256'), 'hex')),
  ('31000000-dddd-0000-0000-000000000002'::uuid, '31000000-aaaa-0000-0000-000000000002'::uuid, '31000000-bbbb-0000-0000-000000000002'::uuid, '31000000-cccc-0000-0000-000000000002'::uuid, true, encode(digest('test-token-b', 'sha256'), 'hex'))
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.operator_checkin_submissions (
  id, organization_id, equipment_id, template_id, settings_id,
  submitted_at, template_snapshot, operator_field_values, client_field_values, equipment_field_values,
  checklist_answers, is_complete, required_item_count, answered_required_count
) VALUES (
  '31000000-eeee-0000-0000-000000000001'::uuid,
  '31000000-aaaa-0000-0000-000000000001'::uuid,
  '31000000-bbbb-0000-0000-000000000001'::uuid,
  '31000000-cccc-0000-0000-000000000001'::uuid,
  '31000000-dddd-0000-0000-000000000001'::uuid,
  NOW(), '{"name":"Daily Truck Check"}'::jsonb,
  '[{"field_id":"f1","label":"Your name","source":"operator_input","value":"Jane Operator"}]'::jsonb,
  '[]'::jsonb, '[]'::jsonb,
  '[{"item_id":"i1","passed":true}]'::jsonb,
  true, 1, 1
);

SELECT has_table('public', 'operator_checklist_templates', 'operator_checklist_templates exists');
SELECT has_table('public', 'equipment_operator_checkin_settings', 'equipment_operator_checkin_settings exists');
SELECT has_table('public', 'operator_checkin_submissions', 'operator_checkin_submissions exists');

SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO '31000000-0000-0000-0000-000000000001';

SELECT ok(
  (SELECT count(*)::int FROM public.operator_checklist_templates WHERE organization_id = '31000000-aaaa-0000-0000-000000000001'::uuid) >= 1,
  'org owner can read templates in their org'
);

SELECT ok(
  (SELECT count(*)::int FROM public.equipment_operator_checkin_settings WHERE equipment_id = '31000000-bbbb-0000-0000-000000000001'::uuid) = 2,
  'org owner can read multiple check-in assignments on one equipment record'
);

SELECT ok(
  (SELECT count(*)::int FROM public.operator_checkin_submissions WHERE organization_id = '31000000-aaaa-0000-0000-000000000001'::uuid) = 1,
  'org owner can read submissions in their org'
);

SET LOCAL request.jwt.claim.sub TO '31000000-0000-0000-0000-000000000002';

SELECT ok(
  (SELECT count(*)::int FROM public.operator_checklist_templates WHERE organization_id = '31000000-aaaa-0000-0000-000000000002'::uuid) = 1
  AND (SELECT count(*)::int FROM public.operator_checklist_templates WHERE organization_id = '31000000-aaaa-0000-0000-000000000001'::uuid) = 0,
  'cross-org template isolation'
);

SELECT ok(
  (SELECT count(*)::int FROM public.operator_checkin_submissions WHERE organization_id = '31000000-aaaa-0000-0000-000000000001'::uuid) = 0,
  'cross-org submission isolation'
);

SET LOCAL role TO anon;

SELECT ok(
  (SELECT count(*)::int FROM public.operator_checkin_submissions) = 0,
  'anon cannot read submissions directly'
);

RESET role;

SELECT ok(
  (SELECT count(*)::int FROM pg_policies WHERE tablename = 'operator_checkin_submissions' AND cmd = 'INSERT') = 0,
  'no direct INSERT policy on submissions (edge function only)'
);

SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO '31000000-0000-0000-0000-000000000001';

SELECT throws_ok(
  $$ UPDATE public.operator_checklist_templates
     SET is_active = false
     WHERE id = '31000000-cccc-0000-0000-000000000003'::uuid $$,
  'Cannot deactivate operator checklist template while enabled equipment assignments exist',
  'direct template deactivation blocked while enabled assignments exist'
);

INSERT INTO public.operator_checklist_templates (
  id, organization_id, name, template_data, is_active, created_by
) VALUES (
  '31000000-cccc-0000-0000-000000000004'::uuid,
  '31000000-aaaa-0000-0000-000000000001'::uuid,
  'Persistence Check',
  '{"checklistItems":[],"dataFields":[]}'::jsonb,
  false,
  '31000000-0000-0000-0000-000000000001'::uuid
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.equipment_operator_checkin_settings (
  id, organization_id, equipment_id, template_id, enabled, public_token_hash
) VALUES (
  '31000000-dddd-0000-0000-000000000004'::uuid,
  '31000000-aaaa-0000-0000-000000000001'::uuid,
  '31000000-bbbb-0000-0000-000000000001'::uuid,
  '31000000-cccc-0000-0000-000000000004'::uuid,
  true,
  encode(digest('test-token-d', 'sha256'), 'hex')
) ON CONFLICT (id) DO NOTHING;

SELECT ok(
  (SELECT is_active FROM public.operator_checklist_templates
    WHERE id = '31000000-cccc-0000-0000-000000000004'::uuid) = true,
  'enabled assignment reactivates inactive template'
);

SELECT ok(
  public.resolve_operator_checkin_by_token(
    encode(digest('test-token-d', 'sha256'), 'hex')
  ) IS NOT NULL,
  'public token resolves for reactivated assigned template'
);

RESET role;

SELECT throws_ok(
  $$ INSERT INTO public.equipment_operator_checkin_settings (
       id, organization_id, equipment_id, template_id, enabled, public_token_hash
     ) VALUES (
       '31000000-dddd-0000-0000-000000000099'::uuid,
       '31000000-aaaa-0000-0000-000000000001'::uuid,
       '31000000-bbbb-0000-0000-000000000001'::uuid,
       '31000000-cccc-0000-0000-000000000002'::uuid,
       true,
       encode(digest('test-token-cross-org', 'sha256'), 'hex')
     ) $$,
  'template assignment organization mismatch',
  'cross-org template assignment is rejected by org validation trigger'
);

SELECT throws_ok(
  $$ INSERT INTO public.equipment_operator_checkin_settings (
       id, organization_id, equipment_id, template_id, enabled, public_token_hash
     ) VALUES (
       '31000000-dddd-0000-0000-000000000098'::uuid,
       '31000000-aaaa-0000-0000-000000000001'::uuid,
       '31000000-bbbb-0000-0000-000000000002'::uuid,
       '31000000-cccc-0000-0000-000000000001'::uuid,
       true,
       encode(digest('test-token-cross-org-equipment', 'sha256'), 'hex')
     ) $$,
  'equipment assignment organization mismatch',
  'cross-org equipment assignment is rejected by org validation trigger'
);

SELECT throws_ok(
  $$ INSERT INTO public.operator_checkin_submissions (
       id, organization_id, equipment_id, template_id, settings_id,
       submitted_at, template_snapshot, operator_field_values, client_field_values, equipment_field_values,
       checklist_answers, is_complete, required_item_count, answered_required_count
     ) VALUES (
       '31000000-eeee-0000-0000-000000000099'::uuid,
       '31000000-aaaa-0000-0000-000000000002'::uuid,
       '31000000-bbbb-0000-0000-000000000002'::uuid,
       '31000000-cccc-0000-0000-000000000001'::uuid,
       '31000000-dddd-0000-0000-000000000002'::uuid,
       NOW(), '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, true, 0, 0
     ) $$,
  'template submission organization mismatch',
  'cross-org submission insert is rejected by org validation trigger'
);

SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO '31000000-0000-0000-0000-000000000001';

RESET role;

ALTER TABLE public.operator_checkin_submissions
  DISABLE TRIGGER trg_validate_operator_checkin_submission_org_refs;

INSERT INTO public.operator_checkin_submissions (
  id, organization_id, equipment_id, template_id, settings_id,
  submitted_at, template_snapshot, operator_field_values, client_field_values, equipment_field_values,
  checklist_answers, is_complete, required_item_count, answered_required_count
) VALUES (
  '31000000-eeee-0000-0000-000000000098'::uuid,
  '31000000-aaaa-0000-0000-000000000002'::uuid,
  '31000000-bbbb-0000-0000-000000000002'::uuid,
  '31000000-cccc-0000-0000-000000000004'::uuid,
  '31000000-dddd-0000-0000-000000000002'::uuid,
  NOW(), '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, true, 0, 0
);

ALTER TABLE public.operator_checkin_submissions
  ENABLE TRIGGER trg_validate_operator_checkin_submission_org_refs;

SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO '31000000-0000-0000-0000-000000000001';

SELECT throws_ok(
  $$ SELECT public.delete_operator_checklist_template('31000000-cccc-0000-0000-000000000004'::uuid) $$,
  'Cannot purge template: cross-organization submission references detected',
  'purge rejects cross-org submission references without nulling template_id'
);

SELECT ok(
  (SELECT template_id FROM public.operator_checkin_submissions
    WHERE id = '31000000-eeee-0000-0000-000000000098'::uuid)
    = '31000000-cccc-0000-0000-000000000004'::uuid,
  'cross-org submission template_id is preserved when purge is rejected'
);

SELECT ok(
  public.delete_operator_checklist_template('31000000-cccc-0000-0000-000000000001'::uuid) = 1,
  'org owner can archive template and disable related assignments'
);

SELECT ok(
  (SELECT is_active FROM public.operator_checklist_templates WHERE id = '31000000-cccc-0000-0000-000000000001'::uuid) = false,
  'archived template is marked inactive'
);

SELECT ok(
  (SELECT count(*)::int FROM public.equipment_operator_checkin_settings
    WHERE template_id = '31000000-cccc-0000-0000-000000000001'::uuid AND enabled = true) = 0,
  'archived template disables all related assignments'
);

SELECT ok(
  (SELECT count(*)::int FROM public.operator_checkin_submissions
    WHERE id = '31000000-eeee-0000-0000-000000000001'::uuid) = 1,
  'archived template preserves existing submissions'
);

SELECT ok(
  public.resolve_operator_checkin_by_token(
    encode(digest('test-token-a', 'sha256'), 'hex')
  ) IS NULL,
  'archived template public token is unavailable'
);

SELECT ok(
  public.delete_operator_checklist_template('31000000-cccc-0000-0000-000000000003'::uuid) = -1,
  'unused template delete purges template row'
);

SELECT ok(
  (SELECT count(*)::int FROM public.operator_checklist_templates
    WHERE id = '31000000-cccc-0000-0000-000000000003'::uuid) = 0,
  'purged template is removed from operator_checklist_templates'
);

SELECT ok(
  (SELECT count(*)::int FROM public.equipment_operator_checkin_settings
    WHERE template_id = '31000000-cccc-0000-0000-000000000003'::uuid) = 0,
  'purged template removes related equipment assignments'
);

SELECT ok(
  public.restore_operator_checklist_template('31000000-cccc-0000-0000-000000000001'::uuid) = 1,
  'org owner can restore archived template and re-enable assignments'
);

SELECT ok(
  (SELECT is_active FROM public.operator_checklist_templates WHERE id = '31000000-cccc-0000-0000-000000000001'::uuid) = true,
  'restored template is marked active again'
);

SELECT ok(
  (SELECT count(*)::int FROM public.equipment_operator_checkin_settings
    WHERE template_id = '31000000-cccc-0000-0000-000000000001'::uuid AND enabled = true) = 1,
  'restored template re-enables related assignments'
);

SELECT ok(
  public.resolve_operator_checkin_by_token(
    encode(digest('test-token-a', 'sha256'), 'hex')
  ) IS NOT NULL,
  'restored template public token is available again'
);

SET LOCAL request.jwt.claim.sub TO '31000000-0000-0000-0000-000000000002';

SELECT throws_ok(
  $$ SELECT public.delete_operator_checklist_template('31000000-cccc-0000-0000-000000000001'::uuid) $$,
  'Forbidden',
  'cross-org template archive is rejected'
);

SELECT throws_ok(
  $$ SELECT public.restore_operator_checklist_template('31000000-cccc-0000-0000-000000000001'::uuid) $$,
  'Forbidden',
  'cross-org template restore is rejected'
);

RESET role;

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    INNER JOIN pg_class AS t ON t.oid = c.conrelid
    INNER JOIN pg_namespace AS n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'equipment_operator_checkin_settings'
      AND c.conname = 'equipment_operator_checkin_settings_equipment_org_fkey'
  ),
  'equipment_operator_checkin_settings has composite equipment/org foreign key'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    INNER JOIN pg_class AS t ON t.oid = c.conrelid
    INNER JOIN pg_namespace AS n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'equipment_operator_checkin_settings'
      AND c.conname = 'equipment_operator_checkin_settings_template_org_fkey'
  ),
  'equipment_operator_checkin_settings has composite template/org foreign key'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    INNER JOIN pg_class AS t ON t.oid = c.conrelid
    INNER JOIN pg_namespace AS n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'operator_checkin_submissions'
      AND c.conname = 'operator_checkin_submissions_template_organization_fkey'
  ),
  'operator_checkin_submissions has composite template/org foreign key'
);

SELECT * FROM finish();
ROLLBACK;
