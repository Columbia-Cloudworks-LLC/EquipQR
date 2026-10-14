-- pgTAP coverage for in-app Done-For-You provisioning (issue #1648 review):
-- service-role-only surface, idempotent creation, attribution, the
-- existing-account guard, and operator reach ending once anyone joins.

BEGIN;
SELECT plan(26);

-- Operator account (needs a profile for provisioned_by / staged_by).
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES
  ('15000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid,
   'pgtap-operator@equipqr.test', '', now(), now(), now(),
   '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "pgTAP Operator"}'::jsonb,
   false, 'authenticated', 'authenticated', '', '', '', ''),
  ('15000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000'::uuid,
   'pgtap-operator-2@equipqr.test', '', now(), now(), now(),
   '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "pgTAP Operator 2"}'::jsonb,
   false, 'authenticated', 'authenticated', '', '', '', ''),
  ('15000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000000'::uuid,
   'pgtap-existing@equipqr.test', '', now(), now(), now(),
   '{"provider": "email", "providers": ["email"]}'::jsonb, '{"name": "pgTAP Existing"}'::jsonb,
   false, 'authenticated', 'authenticated', '', '', '', '');

-- -----------------------------------------------------------------------------
-- Surface: service role only
-- -----------------------------------------------------------------------------

SELECT is(
  (SELECT count(*)::integer
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'org_is_operator_editable', 'assert_org_operator_editable', 'operator_verified_account_emails',
        'operator_stage_member', 'provision_organization', 'operator_list_unclaimed_organizations',
        'operator_get_organization', 'operator_revoke_staged_member', 'operator_add_equipment',
        'operator_delete_equipment')
      AND (has_function_privilege('authenticated', p.oid, 'EXECUTE')
        OR has_function_privilege('anon', p.oid, 'EXECUTE'))),
  0,
  'No operator provisioning function is executable by anon or authenticated'
);

SELECT is(
  (SELECT count(*)::integer
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('provision_organization', 'operator_stage_member', 'operator_add_equipment')
      AND has_function_privilege('service_role', p.oid, 'EXECUTE')),
  3,
  'service_role can execute the provisioning functions'
);

-- -----------------------------------------------------------------------------
-- Create
-- -----------------------------------------------------------------------------

SELECT throws_ok(
  $$SELECT public.provision_organization(
      '95000000-0000-0000-0000-0000000000aa'::uuid,
      '15000000-0000-0000-0000-000000000001'::uuid,
      'No Owner Yard', '',
      '[{"email": "a@equipqr.test", "role": "member"}]'::jsonb,
      '[]'::jsonb)$$,
  '22023',
  NULL,
  'Staff without exactly one owner is rejected'
);

CREATE TEMP TABLE pgtap_created AS
SELECT public.provision_organization(
  '95000000-0000-0000-0000-000000000001'::uuid,
  '15000000-0000-0000-0000-000000000001'::uuid,
  '  pgTAP Operator Yard  ',
  'Shop',
  '[{"email": "PGTAP-Op-Owner@EquipQR.test", "role": "owner"},
    {"email": "pgtap-op-mech@equipqr.test", "role": "member", "team_role": "technician"}]'::jsonb,
  '[{"name": "Loader 1", "serial_number": "L1"},
    {"name": "Loader 2", "manufacturer": "Cat", "installation_date": "2020-05-01", "status": "maintenance"}]'::jsonb
) AS result;

SELECT is((SELECT (result->>'created')::boolean FROM pgtap_created), true, 'First request creates the organization');

CREATE TEMP TABLE pgtap_org AS
SELECT (result->>'organization_id')::uuid AS id FROM pgtap_created;

SELECT results_eq(
  $$SELECT name, provisioned_by, (provisioned_at IS NOT NULL), member_count
      FROM public.organizations WHERE id = (SELECT id FROM pgtap_org)$$,
  $$VALUES ('pgTAP Operator Yard'::text, '15000000-0000-0000-0000-000000000001'::uuid, true, 0)$$,
  'Organization is trimmed, attributed, provisioned, and has no members'
);

SELECT is(
  (SELECT count(*)::integer FROM public.equipment WHERE organization_id = (SELECT id FROM pgtap_org)),
  2,
  'Equipment is imported'
);

SELECT is(
  (SELECT status::text FROM public.equipment
    WHERE organization_id = (SELECT id FROM pgtap_org) AND name = 'Loader 2'),
  'maintenance',
  'Equipment status is kept'
);

SELECT results_eq(
  $$SELECT email, role, status, staged_by
      FROM public.organization_provisioned_members
     WHERE organization_id = (SELECT id FROM pgtap_org)
     ORDER BY email$$,
  $$VALUES
      ('pgtap-op-mech@equipqr.test'::text, 'member'::text, 'pending'::text, '15000000-0000-0000-0000-000000000001'::uuid),
      ('pgtap-op-owner@equipqr.test'::text, 'owner'::text, 'pending'::text, '15000000-0000-0000-0000-000000000001'::uuid)$$,
  'Staff are staged, normalized, and attributed to the operator'
);

SELECT isnt(
  (SELECT team_id FROM public.organization_provisioned_members WHERE email = 'pgtap-op-mech@equipqr.test'),
  NULL,
  'A staged person with a team role is placed on the yard team'
);

-- Retry with the same request id.
SELECT results_eq(
  $$SELECT (r->>'organization_id')::uuid, (r->>'created')::boolean
      FROM (SELECT public.provision_organization(
        '95000000-0000-0000-0000-000000000001'::uuid,
        '15000000-0000-0000-0000-000000000001'::uuid,
        'pgTAP Operator Yard', 'Shop',
        '[{"email": "pgtap-op-owner@equipqr.test", "role": "owner"}]'::jsonb,
        '[]'::jsonb) AS r) s$$,
  $$SELECT id, false FROM pgtap_org$$,
  'A retried request returns the same organization without creating another'
);

SELECT is(
  (SELECT count(*)::integer FROM public.organizations
    WHERE provisioning_request_id = '95000000-0000-0000-0000-000000000001'::uuid),
  1,
  'Exactly one organization exists for the request id'
);

SELECT throws_ok(
  $$SELECT public.provision_organization(
      '95000000-0000-0000-0000-000000000001'::uuid,
      '15000000-0000-0000-0000-000000000002'::uuid,
      'Hijack', '',
      '[{"email": "x@equipqr.test", "role": "owner"}]'::jsonb,
      '[]'::jsonb)$$,
  '42501',
  NULL,
  'Another operator cannot reuse a request id'
);

-- -----------------------------------------------------------------------------
-- Existing verified accounts need explicit confirmation
-- -----------------------------------------------------------------------------

SELECT throws_like(
  $$SELECT public.provision_organization(
      '95000000-0000-0000-0000-000000000002'::uuid,
      '15000000-0000-0000-0000-000000000001'::uuid,
      'Existing Yard', '',
      '[{"email": "pgtap-existing@equipqr.test", "role": "owner"}]'::jsonb,
      '[]'::jsonb)$$,
  'EXISTING_ACCOUNT',
  'Staging an existing verified account without confirmation is refused'
);

SELECT is(
  public.operator_verified_account_emails(ARRAY['PGTAP-Existing@equipqr.test', 'nobody@equipqr.test']),
  'pgtap-existing@equipqr.test',
  'operator_verified_account_emails reports verified accounts only'
);

-- -----------------------------------------------------------------------------
-- Edits while unclaimed
-- -----------------------------------------------------------------------------

SELECT ok(public.org_is_operator_editable((SELECT id FROM pgtap_org)), 'Unclaimed org is operator-editable');

SELECT is(
  public.operator_add_equipment(
    '15000000-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM pgtap_org),
    '[{"name": "Loader 3"}]'::jsonb),
  1,
  'Operator can add equipment while unclaimed'
);

SELECT lives_ok(
  format($$SELECT public.operator_stage_member(
      '15000000-0000-0000-0000-000000000001'::uuid, %L::uuid, 'pgtap-op-late@equipqr.test', 'member')$$,
    (SELECT id FROM pgtap_org)),
  'Operator can stage another person while unclaimed'
);

SELECT lives_ok(
  format('SELECT public.operator_revoke_staged_member(%L::uuid, %L::uuid)',
    '15000000-0000-0000-0000-000000000001',
    (SELECT id FROM public.organization_provisioned_members WHERE email = 'pgtap-op-late@equipqr.test')),
  'Operator can revoke a staged person while unclaimed'
);

SELECT is(
  (SELECT revoked_by FROM public.organization_provisioned_members WHERE email = 'pgtap-op-late@equipqr.test'),
  '15000000-0000-0000-0000-000000000001'::uuid,
  'Operator revoke is attributed'
);

SELECT ok(
  (SELECT id FROM pgtap_org) IN (SELECT id FROM public.operator_list_unclaimed_organizations()),
  'Unclaimed org is listed for operators'
);

-- -----------------------------------------------------------------------------
-- Once anyone joins, operator reach ends
-- -----------------------------------------------------------------------------

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '15000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000000'::uuid,
  'pgtap-op-mech@equipqr.test', '', now(), now(), now(),
  '{"provider": "google", "providers": ["google"]}'::jsonb, '{"name": "pgTAP Mech"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
);

SELECT ok(NOT public.org_is_operator_editable((SELECT id FROM pgtap_org)),
  'An org with an active member is no longer operator-editable (owner has not claimed yet)');

SELECT throws_ok(
  format($$SELECT public.operator_add_equipment('15000000-0000-0000-0000-000000000001'::uuid, %L::uuid, '[{"name": "X"}]'::jsonb)$$,
    (SELECT id FROM pgtap_org)),
  '42501', 'ORG_NOT_EDITABLE',
  'Operator cannot add equipment after someone joined'
);

SELECT throws_ok(
  format($$SELECT public.operator_delete_equipment('15000000-0000-0000-0000-000000000001'::uuid, %L::uuid, %L::uuid)$$,
    (SELECT id FROM pgtap_org),
    (SELECT id FROM public.equipment WHERE name = 'Loader 1' AND organization_id = (SELECT id FROM pgtap_org))),
  '42501', 'ORG_NOT_EDITABLE',
  'Operator cannot delete equipment after someone joined'
);

SELECT throws_ok(
  format('SELECT public.operator_revoke_staged_member(%L::uuid, %L::uuid)',
    '15000000-0000-0000-0000-000000000001',
    (SELECT id FROM public.organization_provisioned_members WHERE email = 'pgtap-op-owner@equipqr.test')),
  '42501', 'ORG_NOT_EDITABLE',
  'Operator cannot revoke staff after someone joined'
);

SELECT throws_ok(
  format('SELECT public.operator_get_organization(%L::uuid)', (SELECT id FROM pgtap_org)),
  '42501', 'ORG_NOT_EDITABLE',
  'Operator cannot read the org after someone joined'
);

SELECT ok(
  (SELECT id FROM pgtap_org) NOT IN (SELECT id FROM public.operator_list_unclaimed_organizations()),
  'Joined org disappears from the operator list'
);

SELECT * FROM finish();
ROLLBACK;
