-- pgTAP coverage for owner-granted EquipQR Support access (issue #1648 review):
-- grant/extend/revoke, expiry enforced at query time, exclusion from counts,
-- and the guards that stop admins or support from making access permanent.

BEGIN;
SELECT plan(39);

-- Users: owner, admin, two operators, outsider. Each gets a personal org.
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
SELECT u.id, '00000000-0000-0000-0000-000000000000'::uuid, u.email, '', now(), now(), now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb, jsonb_build_object('name', u.name),
  false, 'authenticated', 'authenticated', '', '', '', ''
FROM (VALUES
  ('16000000-0000-0000-0000-000000000001'::uuid, 'pgtap-sa-owner@equipqr.test', 'SA Owner'),
  ('16000000-0000-0000-0000-000000000002'::uuid, 'pgtap-sa-admin@equipqr.test', 'SA Admin'),
  ('16000000-0000-0000-0000-000000000003'::uuid, 'pgtap-sa-op1@equipqr.test', 'SA Operator 1'),
  ('16000000-0000-0000-0000-000000000004'::uuid, 'pgtap-sa-op2@equipqr.test', 'SA Operator 2'),
  ('16000000-0000-0000-0000-000000000005'::uuid, 'pgtap-sa-outsider@equipqr.test', 'SA Outsider')
) AS u(id, email, name);

INSERT INTO public.organizations (id, name, member_count, max_members)
VALUES ('96000000-0000-0000-0000-000000000001'::uuid, 'pgTAP Support Yard', 0, 5);

INSERT INTO public.organization_members (organization_id, user_id, role, status, access_source)
VALUES
  ('96000000-0000-0000-0000-000000000001'::uuid, '16000000-0000-0000-0000-000000000001'::uuid, 'owner', 'active', 'owner'),
  ('96000000-0000-0000-0000-000000000001'::uuid, '16000000-0000-0000-0000-000000000002'::uuid, 'admin', 'active', 'manual');

INSERT INTO public.equipment (id, organization_id, name, manufacturer, model, serial_number, location, installation_date)
VALUES ('96000000-0000-0000-0000-000000000021'::uuid, '96000000-0000-0000-0000-000000000001'::uuid,
  'pgTAP Support Dozer', 'Cat', 'D6', 'SA-1', 'Yard', current_date);

CREATE TEMP TABLE pgtap_sa (k text PRIMARY KEY, v jsonb);
GRANT SELECT ON pgtap_sa TO authenticated;

-- -----------------------------------------------------------------------------
-- Surface
-- -----------------------------------------------------------------------------

SELECT is(
  has_function_privilege('authenticated', 'public.grant_support_access(uuid, uuid, uuid[], integer, text, text)', 'EXECUTE'),
  false,
  'authenticated cannot call grant_support_access directly'
);
SELECT is(
  has_function_privilege('authenticated', 'public.revoke_support_access(uuid)', 'EXECUTE'),
  true,
  'authenticated can call revoke_support_access (owner check inside)'
);
SELECT is(
  has_function_privilege('anon', 'public.revoke_support_access(uuid)', 'EXECUTE'),
  false,
  'anon cannot call revoke_support_access'
);
SELECT is(
  has_function_privilege('authenticated', 'public.cleanup_expired_support_access()', 'EXECUTE'),
  false,
  'authenticated cannot run the cleanup'
);

-- -----------------------------------------------------------------------------
-- Grant
-- -----------------------------------------------------------------------------

SELECT throws_ok(
  $$SELECT public.grant_support_access(
      '96000000-0000-0000-0000-000000000001'::uuid, '16000000-0000-0000-0000-000000000002'::uuid,
      ARRAY['16000000-0000-0000-0000-000000000003'::uuid], 72, 'settings')$$,
  '42501', NULL,
  'An admin who is not the owner cannot grant support access'
);

SELECT throws_ok(
  $$SELECT public.grant_support_access(
      '96000000-0000-0000-0000-000000000001'::uuid, '16000000-0000-0000-0000-000000000001'::uuid,
      ARRAY['16000000-0000-0000-0000-000000000003'::uuid], 720, 'settings')$$,
  '22023', NULL,
  'Durations other than 24, 72, or 168 hours are refused'
);

SELECT throws_ok(
  $$SELECT public.grant_support_access(
      '96000000-0000-0000-0000-000000000001'::uuid, '16000000-0000-0000-0000-000000000001'::uuid,
      ARRAY[]::uuid[], 72, 'settings')$$,
  '22023', NULL,
  'An empty operator list grants nothing'
);

INSERT INTO pgtap_sa VALUES ('grant1', public.grant_support_access(
  '96000000-0000-0000-0000-000000000001'::uuid, '16000000-0000-0000-0000-000000000001'::uuid,
  ARRAY['16000000-0000-0000-0000-000000000003'::uuid, '16000000-0000-0000-0000-000000000004'::uuid],
  72, 'bug_report', '#123'));

INSERT INTO pgtap_sa VALUES ('staged', jsonb_build_object('staged_id', public.stage_provisioned_member(
  '96000000-0000-0000-0000-000000000001'::uuid, 'pgtap-sa-pending@equipqr.test', 'member')));

SELECT is((SELECT (v->>'extended')::boolean FROM pgtap_sa WHERE k = 'grant1'), false, 'First grant is new');

SELECT results_eq(
  $$SELECT role, status, access_source FROM public.organization_members
     WHERE organization_id = '96000000-0000-0000-0000-000000000001'::uuid AND status = 'support'
     ORDER BY user_id$$,
  $$VALUES ('admin'::text, 'support'::text, 'support'::text), ('admin'::text, 'support'::text, 'support'::text)$$,
  'Both operators get admin support memberships'
);

SELECT ok(
  (SELECT expires_at BETWEEN now() + interval '71 hours 59 minutes' AND now() + interval '72 hours 1 minute'
     FROM public.organization_support_grants WHERE organization_id = '96000000-0000-0000-0000-000000000001'::uuid),
  'Grant expires in 72 hours'
);

SELECT is(
  (SELECT member_count FROM public.organizations WHERE id = '96000000-0000-0000-0000-000000000001'::uuid),
  2,
  'Support memberships do not count toward member_count'
);

SELECT is(
  public.calculate_billable_members('96000000-0000-0000-0000-000000000001'::uuid),
  1,
  'Support memberships are not billable'
);

-- -----------------------------------------------------------------------------
-- Access while live
-- -----------------------------------------------------------------------------

SELECT ok(public.is_org_member('16000000-0000-0000-0000-000000000003'::uuid, '96000000-0000-0000-0000-000000000001'::uuid),
  'Live support counts as membership');
SELECT ok(public.is_org_admin('16000000-0000-0000-0000-000000000003'::uuid, '96000000-0000-0000-0000-000000000001'::uuid),
  'Live support has admin data access');
SELECT ok(NOT public.user_is_org_admin('96000000-0000-0000-0000-000000000001'::uuid, '16000000-0000-0000-0000-000000000003'::uuid),
  'Support never passes the member-management check');
SELECT ok(NOT public.can_user_manage_quickbooks('16000000-0000-0000-0000-000000000003'::uuid, '96000000-0000-0000-0000-000000000001'::uuid),
  'Support cannot manage QuickBooks');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '16000000-0000-0000-0000-000000000003', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '16000000-0000-0000-0000-000000000003')::text, true);

SELECT is(
  (SELECT count(*)::integer FROM public.equipment WHERE organization_id = '96000000-0000-0000-0000-000000000001'::uuid),
  1,
  'Operator sees the organization''s equipment while the grant is live'
);

SELECT ok(
  '96000000-0000-0000-0000-000000000001'::uuid IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = '16000000-0000-0000-0000-000000000003'::uuid),
  'Operator''s live support membership is visible to them (org switcher)'
);

SELECT throws_ok(
  $$INSERT INTO public.organization_invitations (organization_id, email, role, invited_by)
    VALUES ('96000000-0000-0000-0000-000000000001'::uuid, 'pgtap-sa-sneaky@equipqr.test', 'admin',
            '16000000-0000-0000-0000-000000000003'::uuid)$$,
  '42501', NULL,
  'Support cannot invite anyone'
);

SELECT throws_ok(
  $$SELECT public.revoke_support_access('96000000-0000-0000-0000-000000000001'::uuid)$$,
  '42501', NULL,
  'Support cannot revoke (or otherwise manage) the grant'
);

SELECT throws_ok(
  $$SELECT * FROM public.get_audit_log_timeline(
      '96000000-0000-0000-0000-000000000001'::uuid, 'day', now() - interval '7 days', now())$$,
  '42501', NULL,
  'Support cannot read the audit log through its RPC'
);

SELECT throws_ok(
  format('SELECT public.revoke_provisioned_member(%L::uuid)',
    (SELECT v->>'staged_id' FROM pgtap_sa WHERE k = 'staged')),
  '42501', NULL,
  'Support cannot revoke pending staff'
);

-- The owner sees the live grant.
SELECT set_config('request.jwt.claim.sub', '16000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '16000000-0000-0000-0000-000000000001')::text, true);

SELECT is(
  (SELECT source FROM public.get_support_access_status('96000000-0000-0000-0000-000000000001'::uuid)),
  'bug_report',
  'Members see the live grant'
);

SELECT lives_ok(
  $$SELECT * FROM public.get_audit_log_timeline(
      '96000000-0000-0000-0000-000000000001'::uuid, 'day', now() - interval '7 days', now())$$,
  'The owner can still read the audit log'
);

SELECT set_config('request.jwt.claim.sub', '16000000-0000-0000-0000-000000000005', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '16000000-0000-0000-0000-000000000005')::text, true);

SELECT is(
  (SELECT count(*)::integer FROM public.get_support_access_status('96000000-0000-0000-0000-000000000001'::uuid)),
  0,
  'Outsiders cannot see the grant'
);

RESET ROLE;

-- Member writes go through SECURITY DEFINER RPCs (direct authenticated UPDATEs on
-- organization_members are already blocked by its RLS policies). The guard
-- trigger stops any such path from making support access permanent.
SELECT throws_ok(
  $$UPDATE public.organization_members
       SET status = 'active', access_source = 'manual', support_grant_id = NULL
     WHERE user_id = '16000000-0000-0000-0000-000000000003'::uuid
       AND organization_id = '96000000-0000-0000-0000-000000000001'::uuid$$,
  '42501', NULL,
  'Nobody can turn a support membership into a permanent one'
);

SELECT throws_ok(
  format($$INSERT INTO public.organization_members (organization_id, user_id, role, status, access_source, support_grant_id)
    VALUES ('96000000-0000-0000-0000-000000000001'::uuid, '16000000-0000-0000-0000-000000000005'::uuid,
            'admin', 'support', 'support', %L::uuid)$$, (SELECT v->>'grant_id' FROM pgtap_sa WHERE k = 'grant1')),
  '42501', NULL,
  'Nobody can insert a support membership directly'
);


-- -----------------------------------------------------------------------------
-- Extend
-- -----------------------------------------------------------------------------

INSERT INTO pgtap_sa VALUES ('grant2', public.grant_support_access(
  '96000000-0000-0000-0000-000000000001'::uuid, '16000000-0000-0000-0000-000000000001'::uuid,
  ARRAY['16000000-0000-0000-0000-000000000003'::uuid, '16000000-0000-0000-0000-000000000004'::uuid],
  168, 'settings'));

SELECT results_eq(
  $$SELECT (v->>'extended')::boolean, v->>'grant_id' FROM pgtap_sa WHERE k = 'grant2'$$,
  $$SELECT true, v->>'grant_id' FROM pgtap_sa WHERE k = 'grant1'$$,
  'Granting again while live extends the same grant'
);

-- -----------------------------------------------------------------------------
-- Expiry is enforced at query time, before any cleanup
-- -----------------------------------------------------------------------------

UPDATE public.organization_support_grants
SET granted_at = now() - interval '3 days', expires_at = now() - interval '1 minute'
WHERE organization_id = '96000000-0000-0000-0000-000000000001'::uuid;

SELECT ok(NOT public.is_org_member('16000000-0000-0000-0000-000000000003'::uuid, '96000000-0000-0000-0000-000000000001'::uuid),
  'Expired support is not membership, with the row still present');
SELECT ok(NOT public.is_org_admin('16000000-0000-0000-0000-000000000003'::uuid, '96000000-0000-0000-0000-000000000001'::uuid),
  'Expired support has no admin access');
SELECT ok(
  '96000000-0000-0000-0000-000000000001'::uuid NOT IN (
    SELECT organization_id FROM public.get_user_organizations('16000000-0000-0000-0000-000000000003'::uuid)),
  'Expired support drops out of get_user_organizations'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '16000000-0000-0000-0000-000000000003', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '16000000-0000-0000-0000-000000000003')::text, true);

SELECT is(
  (SELECT count(*)::integer FROM public.equipment WHERE organization_id = '96000000-0000-0000-0000-000000000001'::uuid),
  0,
  'Operator sees no equipment once the grant has expired'
);
SELECT is(
  (SELECT count(*)::integer FROM public.organization_members WHERE organization_id = '96000000-0000-0000-0000-000000000001'::uuid),
  0,
  'Expired support rows are hidden from direct queries'
);
RESET ROLE;

SELECT is(public.cleanup_expired_support_access(), 2, 'Cleanup removes the expired support rows');

-- A new grant after expiry closes the old one and opens a new one.
INSERT INTO pgtap_sa VALUES ('grant3', public.grant_support_access(
  '96000000-0000-0000-0000-000000000001'::uuid, '16000000-0000-0000-0000-000000000001'::uuid,
  ARRAY['16000000-0000-0000-0000-000000000003'::uuid], 24, 'settings'));

SELECT is(
  (SELECT count(*)::integer FROM public.organization_support_grants
    WHERE organization_id = '96000000-0000-0000-0000-000000000001'::uuid AND revoked_at IS NULL),
  1,
  'Only one open grant per organization'
);

-- -----------------------------------------------------------------------------
-- Revoke
-- -----------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '16000000-0000-0000-0000-000000000002', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '16000000-0000-0000-0000-000000000002')::text, true);
SELECT throws_ok(
  $$SELECT public.revoke_support_access('96000000-0000-0000-0000-000000000001'::uuid)$$,
  '42501', NULL,
  'Admins who are not the owner cannot revoke'
);

SELECT set_config('request.jwt.claim.sub', '16000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims', json_build_object('sub', '16000000-0000-0000-0000-000000000001')::text, true);
SELECT ok(public.revoke_support_access('96000000-0000-0000-0000-000000000001'::uuid), 'The owner can revoke');
RESET ROLE;

SELECT ok(NOT public.is_org_member('16000000-0000-0000-0000-000000000003'::uuid, '96000000-0000-0000-0000-000000000001'::uuid),
  'Revoked support has no access');
SELECT is(
  (SELECT count(*)::integer FROM public.organization_members
    WHERE organization_id = '96000000-0000-0000-0000-000000000001'::uuid AND status = 'support'),
  0,
  'Revoke removes support memberships'
);

SELECT * FROM finish();
ROLLBACK;
