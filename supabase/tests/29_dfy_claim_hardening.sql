-- pgTAP coverage for the Done-For-You review follow-ups (issue #1648):
-- 'provisioned' access_source, claim isolation, claimed_role, owner revoke of
-- pending staff, and the personal-org fallback after a revoked staged row.

BEGIN;
SELECT plan(18);

INSERT INTO public.organizations (id, name, member_count, max_members, provisioned_at)
VALUES
  ('94000000-0000-0000-0000-000000000001'::uuid, 'pgTAP DFY Hardening Yard', 0, 10, now()),
  ('94000000-0000-0000-0000-000000000002'::uuid, 'pgTAP DFY Broken Yard', 0, 10, now());

SELECT public.stage_provisioned_member(
  '94000000-0000-0000-0000-000000000001'::uuid, 'pgtap-hard-owner@equipqr.test', 'owner');
SELECT public.stage_provisioned_member(
  '94000000-0000-0000-0000-000000000001'::uuid, 'pgtap-hard-pending@equipqr.test', 'member');
SELECT public.stage_provisioned_member(
  '94000000-0000-0000-0000-000000000002'::uuid, 'pgtap-hard-broken@equipqr.test', 'member');

-- -----------------------------------------------------------------------------
-- access_source values
-- -----------------------------------------------------------------------------

SELECT ok(
  pg_get_constraintdef(
    (SELECT oid FROM pg_constraint WHERE conname = 'organization_members_access_source_check')
  ) LIKE '%provisioned%support%',
  'access_source allows provisioned and support'
);

-- -----------------------------------------------------------------------------
-- A claim that fails never aborts the sign-in
-- -----------------------------------------------------------------------------

CREATE FUNCTION pg_temp.fail_broken_yard_member()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.organization_id = '94000000-0000-0000-0000-000000000002'::uuid THEN
    RAISE EXCEPTION 'simulated membership failure';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pgtap_fail_broken_yard_member
  BEFORE INSERT ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_broken_yard_member();

SELECT lives_ok(
  $$INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '14000000-0000-0000-0000-000000000004'::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'pgtap-hard-broken@equipqr.test', '', now(), now(), now(),
      '{"provider": "google", "providers": ["google"]}'::jsonb,
      '{"name": "pgTAP Broken"}'::jsonb,
      false, 'authenticated', 'authenticated', '', '', '', ''
    )$$,
  'Google sign-up succeeds even when the staged claim fails'
);

SELECT results_eq(
  $$SELECT status, (last_claim_error LIKE '%simulated membership failure%')
      FROM public.organization_provisioned_members
     WHERE email = 'pgtap-hard-broken@equipqr.test'$$,
  $$VALUES ('pending'::text, true)$$,
  'Failed claim leaves the staged row pending with the error recorded'
);

DROP TRIGGER pgtap_fail_broken_yard_member ON public.organization_members;

-- -----------------------------------------------------------------------------
-- Claim records 'provisioned' and the granted role
-- -----------------------------------------------------------------------------

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '14000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'pgtap-hard-owner@equipqr.test', '', now(), now(), now(),
  '{"provider": "google", "providers": ["google"]}'::jsonb,
  '{"name": "pgTAP Hard Owner"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
);

SELECT is(
  (SELECT access_source FROM public.organization_members
    WHERE user_id = '14000000-0000-0000-0000-000000000001'::uuid
      AND organization_id = '94000000-0000-0000-0000-000000000001'::uuid),
  'provisioned',
  'Claimed DFY membership is recorded as provisioned'
);

SELECT is(
  (SELECT claimed_role FROM public.organization_provisioned_members
    WHERE email = 'pgtap-hard-owner@equipqr.test'),
  'owner',
  'claimed_role records the granted role'
);

-- -----------------------------------------------------------------------------
-- Owner revoke of pending staff
-- -----------------------------------------------------------------------------

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '14000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'pgtap-hard-outsider@equipqr.test', '', now(), now(), now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "pgTAP Hard Outsider"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
);

-- Capture fixture IDs as postgres: once impersonating, roster RLS would hide
-- rows from a non-admin and the RPC would only ever see NULL.
CREATE TEMP TABLE pgtap_ids AS
SELECT email, id FROM public.organization_provisioned_members
WHERE organization_id = '94000000-0000-0000-0000-000000000001'::uuid;
GRANT SELECT ON pgtap_ids TO authenticated;

SELECT isnt(
  (SELECT id FROM pgtap_ids WHERE email = 'pgtap-hard-pending@equipqr.test'),
  NULL,
  'Fixture: the pending staged member exists'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '14000000-0000-0000-0000-000000000002', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '14000000-0000-0000-0000-000000000002')::text, true);

SELECT throws_ok(
  format('SELECT public.revoke_provisioned_member(%L::uuid)',
    (SELECT id FROM pgtap_ids WHERE email = 'pgtap-hard-pending@equipqr.test')),
  '42501',
  NULL,
  'A non-admin cannot revoke a real pending staged member'
);

SELECT set_config('request.jwt.claim.sub', '14000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '14000000-0000-0000-0000-000000000001')::text, true);

SELECT lives_ok(
  format('SELECT public.revoke_provisioned_member(%L::uuid)',
    (SELECT id FROM pgtap_ids WHERE email = 'pgtap-hard-pending@equipqr.test')),
  'The owner can revoke a pending staged member'
);

SELECT throws_ok(
  format('SELECT public.revoke_provisioned_member(%L::uuid)',
    (SELECT id FROM pgtap_ids WHERE email = 'pgtap-hard-owner@equipqr.test')),
  '22023',
  NULL,
  'A claimed staged member cannot be revoked'
);

RESET ROLE;

SELECT results_eq(
  $$SELECT status, revoked_by, (revoked_at IS NOT NULL)
      FROM public.organization_provisioned_members
     WHERE email = 'pgtap-hard-pending@equipqr.test'$$,
  $$VALUES ('revoked'::text, '14000000-0000-0000-0000-000000000001'::uuid, true)$$,
  'Revoke records who revoked the row and when'
);

SELECT is(
  has_function_privilege('anon', 'public.revoke_provisioned_member(uuid)', 'EXECUTE'),
  false,
  'anon cannot execute revoke_provisioned_member'
);

SELECT is(
  has_function_privilege('authenticated', 'public.ensure_personal_organization(uuid)', 'EXECUTE'),
  false,
  'authenticated cannot execute ensure_personal_organization'
);

-- -----------------------------------------------------------------------------
-- Revoked before verification → personal org on verification
-- -----------------------------------------------------------------------------

SELECT public.stage_provisioned_member(
  '94000000-0000-0000-0000-000000000001'::uuid, 'pgtap-hard-late@equipqr.test', 'member');

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '14000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'pgtap-hard-late@equipqr.test', '', NULL, now(), now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "pgTAP Late"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
);

SELECT is(
  (SELECT count(*)::integer FROM public.personal_organizations
    WHERE user_id = '14000000-0000-0000-0000-000000000003'::uuid),
  0,
  'Unverified staged signup has no personal org yet'
);

UPDATE public.organization_provisioned_members
SET status = 'revoked'
WHERE email = 'pgtap-hard-late@equipqr.test';

UPDATE auth.users
SET email_confirmed_at = now()
WHERE id = '14000000-0000-0000-0000-000000000003'::uuid;

SELECT is(
  (SELECT count(*)::integer FROM public.personal_organizations
    WHERE user_id = '14000000-0000-0000-0000-000000000003'::uuid),
  1,
  'Verifying after the staged row was revoked creates the personal org'
);

SELECT is(
  (SELECT role FROM public.organization_members om
     JOIN public.personal_organizations po
       ON po.organization_id = om.organization_id AND po.user_id = om.user_id
    WHERE om.user_id = '14000000-0000-0000-0000-000000000003'::uuid
      AND om.status = 'active'),
  'owner',
  'The fallback personal org is owned by the user'
);

SELECT is(
  (SELECT count(*)::integer FROM public.organization_members
    WHERE user_id = '14000000-0000-0000-0000-000000000003'::uuid
      AND organization_id = '94000000-0000-0000-0000-000000000001'::uuid),
  0,
  'The revoked staged row binds nothing'
);

-- Normal verified signups are unaffected (no duplicate personal org).
UPDATE auth.users
SET email_confirmed_at = now()
WHERE id = '14000000-0000-0000-0000-000000000002'::uuid;

SELECT is(
  (SELECT count(*)::integer FROM public.personal_organizations
    WHERE user_id = '14000000-0000-0000-0000-000000000002'::uuid),
  1,
  'An ordinary user keeps exactly one personal org'
);

SELECT is(
  (SELECT count(*)::integer FROM public.organization_members
    WHERE organization_id = '94000000-0000-0000-0000-000000000002'::uuid),
  0,
  'The broken yard still has no members after the failed claim'
);

SELECT * FROM finish();
ROLLBACK;
