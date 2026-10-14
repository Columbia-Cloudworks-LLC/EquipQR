-- pgTAP coverage for Done-For-You pre-provisioned organizations (issue #1648):
-- shadow-member staging, claim on verified sign-in, and RLS boundaries.

BEGIN;
SELECT plan(32);

-- -----------------------------------------------------------------------------
-- Fixture: a provisioned yard with a team and equipment, and zero auth users.
-- -----------------------------------------------------------------------------

INSERT INTO public.organizations (id, name, member_count, max_members, provisioned_at)
VALUES ('93000000-0000-0000-0000-000000000001'::uuid, 'pgTAP DFY Yard', 0, 10, now());

INSERT INTO public.teams (id, organization_id, name)
VALUES (
  '93000000-0000-0000-0000-000000000011'::uuid,
  '93000000-0000-0000-0000-000000000001'::uuid,
  'pgTAP DFY Shop'
);

INSERT INTO public.equipment (
  id, organization_id, team_id, name, manufacturer, model, serial_number, location, installation_date
) VALUES (
  '93000000-0000-0000-0000-000000000021'::uuid,
  '93000000-0000-0000-0000-000000000001'::uuid,
  '93000000-0000-0000-0000-000000000011'::uuid,
  'pgTAP Excavator',
  'Deere',
  '310SL',
  'PGTAP-DFY-001',
  'Yard',
  current_date
);

SELECT is(
  (SELECT count(*)::integer FROM public.organization_members
    WHERE organization_id = '93000000-0000-0000-0000-000000000001'::uuid),
  0,
  'Provisioned org with equipment exists with zero members'
);

-- -----------------------------------------------------------------------------
-- Staging
-- -----------------------------------------------------------------------------

SELECT lives_ok(
  $$SELECT public.stage_provisioned_member(
      '93000000-0000-0000-0000-000000000001'::uuid,
      '  PGTAP-DFY-Owner@EquipQR.test ',
      'owner')$$,
  'Operator can stage an owner email before the user exists'
);

SELECT lives_ok(
  $$SELECT public.stage_provisioned_member(
      '93000000-0000-0000-0000-000000000001'::uuid,
      'pgtap-dfy-mechanic@equipqr.test',
      'member',
      '93000000-0000-0000-0000-000000000011'::uuid,
      'technician')$$,
  'Operator can stage a mechanic email with a team role'
);

SELECT is(
  (SELECT email FROM public.organization_provisioned_members
    WHERE organization_id = '93000000-0000-0000-0000-000000000001'::uuid
      AND role = 'owner'),
  'pgtap-dfy-owner@equipqr.test',
  'Staged email is stored normalized'
);

SELECT throws_ok(
  $$SELECT public.stage_provisioned_member(
      '93000000-0000-0000-0000-000000000001'::uuid,
      'PGTAP-DFY-OWNER@equipqr.test',
      'admin')$$,
  '23505',
  NULL,
  'Duplicate live staging for the same (organization, email) is rejected'
);

SELECT throws_ok(
  $$SELECT public.stage_provisioned_member(
      '93000000-0000-0000-0000-000000000001'::uuid,
      'pgtap-dfy-second-owner@equipqr.test',
      'owner')$$,
  '23505',
  NULL,
  'A second live staged owner for the same organization is rejected'
);

SELECT throws_ok(
  $$SELECT public.stage_provisioned_member(
      '93000000-0000-0000-0000-000000000001'::uuid,
      'pgtap-dfy-mechanic-2@equipqr.test',
      'mechanic')$$,
  '23514',
  NULL,
  'Unknown roles are rejected'
);

-- -----------------------------------------------------------------------------
-- Privilege boundaries on the internals
-- -----------------------------------------------------------------------------

SELECT is(
  has_function_privilege('authenticated', 'public.claim_provisioned_memberships(uuid)', 'EXECUTE'),
  false,
  'authenticated cannot execute claim_provisioned_memberships'
);

SELECT is(
  has_function_privilege('anon', 'public.claim_provisioned_memberships(uuid)', 'EXECUTE'),
  false,
  'anon cannot execute claim_provisioned_memberships'
);

SELECT is(
  has_function_privilege(
    'authenticated',
    'public.stage_provisioned_member(uuid, text, text, uuid, public.team_member_role)',
    'EXECUTE'),
  false,
  'authenticated cannot execute stage_provisioned_member'
);

SELECT is(
  has_table_privilege('authenticated', 'public.organization_provisioned_members', 'INSERT'),
  false,
  'authenticated cannot insert staged members'
);

SELECT is(
  has_table_privilege('anon', 'public.organization_provisioned_members', 'SELECT'),
  false,
  'anon cannot read staged members'
);

-- -----------------------------------------------------------------------------
-- An unrelated verified user (gets a personal org) cannot see the yard.
-- -----------------------------------------------------------------------------

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '13000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'pgtap-dfy-outsider@equipqr.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "pgTAP DFY Outsider"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '13000000-0000-0000-0000-000000000003', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '13000000-0000-0000-0000-000000000003', 'email', 'pgtap-dfy-outsider@equipqr.test')::text,
  true
);

SELECT is(
  (SELECT count(*)::integer FROM public.organizations
    WHERE id = '93000000-0000-0000-0000-000000000001'::uuid),
  0,
  'Outsider cannot see the unclaimed organization'
);

SELECT is(
  (SELECT count(*)::integer FROM public.equipment
    WHERE organization_id = '93000000-0000-0000-0000-000000000001'::uuid),
  0,
  'Outsider cannot see the unclaimed organization''s equipment'
);

SELECT is(
  (SELECT count(*)::integer FROM public.organization_provisioned_members),
  0,
  'Outsider cannot see staged members'
);

RESET ROLE;

-- -----------------------------------------------------------------------------
-- Owner signs up with an UNVERIFIED email: nothing is bound yet.
-- -----------------------------------------------------------------------------

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '13000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'pgtap-dfy-owner@equipqr.test',
  '',
  NULL, now(), now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "pgTAP DFY Owner"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
);

SELECT is(
  (SELECT count(*)::integer FROM public.organization_members
    WHERE user_id = '13000000-0000-0000-0000-000000000001'::uuid),
  0,
  'Unverified signup with a staged email is not bound to any organization'
);

SELECT is(
  (SELECT status FROM public.organization_provisioned_members
    WHERE email = 'pgtap-dfy-owner@equipqr.test'),
  'pending',
  'Staged owner row stays pending until the email is verified'
);

SELECT is(
  (SELECT count(*)::integer FROM public.personal_organizations
    WHERE user_id = '13000000-0000-0000-0000-000000000001'::uuid),
  0,
  'Staged signup does not get an empty personal organization'
);

-- Magic link / invite link verification sets email_confirmed_at.
UPDATE auth.users
SET email_confirmed_at = now()
WHERE id = '13000000-0000-0000-0000-000000000001'::uuid;

SELECT results_eq(
  $$SELECT role, status, access_source, (product_onboarding_completed_at IS NOT NULL)
      FROM public.organization_members
     WHERE user_id = '13000000-0000-0000-0000-000000000001'::uuid
       AND organization_id = '93000000-0000-0000-0000-000000000001'::uuid$$,
  $$VALUES ('owner'::text, 'active'::text, 'invitation'::text, true)$$,
  'Email verification binds the staged owner as active owner with onboarding completed'
);

SELECT results_eq(
  $$SELECT status, claimed_user_id
      FROM public.organization_provisioned_members
     WHERE email = 'pgtap-dfy-owner@equipqr.test'$$,
  $$VALUES ('claimed'::text, '13000000-0000-0000-0000-000000000001'::uuid)$$,
  'Staged owner row is marked claimed by the new user'
);

SELECT isnt(
  (SELECT claimed_at FROM public.organizations
    WHERE id = '93000000-0000-0000-0000-000000000001'::uuid),
  NULL,
  'Organization records when its owner claimed it'
);

-- -----------------------------------------------------------------------------
-- Mechanic signs in with Google (verified at insert): bound immediately.
-- -----------------------------------------------------------------------------

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '13000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'PGTAP-DFY-Mechanic@equipqr.test',
  '',
  now(), now(), now(),
  '{"provider": "google", "providers": ["google"]}'::jsonb,
  '{"name": "pgTAP DFY Mechanic"}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
);

SELECT is(
  (SELECT role FROM public.organization_members
    WHERE user_id = '13000000-0000-0000-0000-000000000002'::uuid
      AND organization_id = '93000000-0000-0000-0000-000000000001'::uuid
      AND status = 'active'),
  'member',
  'Google OAuth signup binds the staged mechanic as an active member'
);

SELECT is(
  (SELECT role::text FROM public.team_members
    WHERE user_id = '13000000-0000-0000-0000-000000000002'::uuid
      AND team_id = '93000000-0000-0000-0000-000000000011'::uuid),
  'technician',
  'Staged mechanic is placed on the staged team with the staged team role'
);

SELECT is(
  (SELECT count(*)::integer FROM public.organization_members
    WHERE user_id = '13000000-0000-0000-0000-000000000002'::uuid),
  1,
  'Staged mechanic lands only in the provisioned yard (no personal org)'
);

-- -----------------------------------------------------------------------------
-- After claim: owner sees the yard; mechanic sees only their own staged row.
-- -----------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '13000000-0000-0000-0000-000000000001', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '13000000-0000-0000-0000-000000000001', 'email', 'pgtap-dfy-owner@equipqr.test')::text,
  true
);

SELECT is(
  (SELECT count(*)::integer FROM public.equipment
    WHERE organization_id = '93000000-0000-0000-0000-000000000001'::uuid),
  1,
  'Claimed owner can see the pre-provisioned equipment'
);

SELECT is(
  (SELECT count(*)::integer FROM public.organization_provisioned_members
    WHERE organization_id = '93000000-0000-0000-0000-000000000001'::uuid),
  2,
  'Claimed owner (org admin) can review the staged roster'
);

SELECT is(
  (SELECT needs_onboarding
     FROM public.get_product_onboarding_status('93000000-0000-0000-0000-000000000001'::uuid)),
  false,
  'Claimed owner bypasses the product onboarding wizard'
);

SELECT set_config('request.jwt.claim.sub', '13000000-0000-0000-0000-000000000002', true);
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', '13000000-0000-0000-0000-000000000002', 'email', 'pgtap-dfy-mechanic@equipqr.test')::text,
  true
);

SELECT is(
  (SELECT count(*)::integer FROM public.organization_provisioned_members),
  1,
  'Mechanic can see only their own claimed staged row'
);

RESET ROLE;

-- -----------------------------------------------------------------------------
-- Staging an email that already has a verified account claims immediately.
-- -----------------------------------------------------------------------------

SELECT public.stage_provisioned_member(
  '93000000-0000-0000-0000-000000000001'::uuid,
  'pgtap-dfy-outsider@equipqr.test',
  'admin'
);

SELECT is(
  (SELECT role FROM public.organization_members
    WHERE user_id = '13000000-0000-0000-0000-000000000003'::uuid
      AND organization_id = '93000000-0000-0000-0000-000000000001'::uuid
      AND status = 'active'),
  'admin',
  'Staging an existing verified user binds them right away'
);

SELECT is(
  (SELECT count(*)::integer FROM public.organization_provisioned_members
    WHERE organization_id = '93000000-0000-0000-0000-000000000001'::uuid
      AND status = 'pending'),
  0,
  'No staged rows remain pending after all claims'
);

-- -----------------------------------------------------------------------------
-- Deleting a staged team must not be blocked by the team_role check.
-- -----------------------------------------------------------------------------

SELECT lives_ok(
  $$DELETE FROM public.teams WHERE id = '93000000-0000-0000-0000-000000000011'::uuid$$,
  'A team referenced by a staged member with a team role can be deleted'
);

SELECT results_eq(
  $$SELECT team_id, team_role::text
      FROM public.organization_provisioned_members
     WHERE email = 'pgtap-dfy-mechanic@equipqr.test'$$,
  $$VALUES (NULL::uuid, NULL::text)$$,
  'Team deletion clears both team_id and team_role on the staged row'
);

SELECT * FROM finish();
ROLLBACK;
