-- pgTAP: organizations no longer have an enforced member limit (issue #1648 review).

BEGIN;
SELECT plan(3);

SELECT hasnt_trigger('public', 'organization_members', 'trigger_validate_member_limit',
  'The member-limit trigger is gone');

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
SELECT u.id, '00000000-0000-0000-0000-000000000000'::uuid, u.email, '', now(), now(), now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb, '{}'::jsonb,
  false, 'authenticated', 'authenticated', '', '', '', ''
FROM (VALUES
  ('18000000-0000-0000-0000-000000000001'::uuid, 'pgtap-limit-1@equipqr.test'),
  ('18000000-0000-0000-0000-000000000002'::uuid, 'pgtap-limit-2@equipqr.test')
) AS u(id, email);

INSERT INTO public.organizations (id, name, member_count, max_members)
VALUES ('98000000-0000-0000-0000-000000000001'::uuid, 'pgTAP Full Org', 0, 1);

INSERT INTO public.organization_members (organization_id, user_id, role, status)
VALUES ('98000000-0000-0000-0000-000000000001'::uuid, '18000000-0000-0000-0000-000000000001'::uuid, 'owner', 'active');

SELECT lives_ok(
  $$INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES ('98000000-0000-0000-0000-000000000001'::uuid, '18000000-0000-0000-0000-000000000002'::uuid, 'member', 'active')$$,
  'A member can join an organization already at max_members'
);

SELECT is(
  (SELECT member_count FROM public.organizations WHERE id = '98000000-0000-0000-0000-000000000001'::uuid),
  2,
  'member_count keeps counting past max_members'
);

SELECT * FROM finish();
ROLLBACK;
