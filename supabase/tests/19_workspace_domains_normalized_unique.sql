BEGIN;
SELECT plan(4);

CREATE TEMP TABLE normalized_domain_ids (
  label text PRIMARY KEY,
  id uuid NOT NULL
);

INSERT INTO normalized_domain_ids (label, id) VALUES
  ('org', '19000000-0000-0000-0000-000000000001'::uuid),
  ('user', '19000000-0000-0000-0000-000000000002'::uuid);

INSERT INTO public.organizations (id, name, plan, member_count, max_members, features)
VALUES (
  (SELECT id FROM normalized_domain_ids WHERE label = 'org'),
  'Normalized Domain Org',
  'free',
  1,
  10,
  ARRAY['Equipment Management']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  (SELECT id FROM normalized_domain_ids WHERE label = 'user'),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'member@normalized-domain.test',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "Normalized Domain User"}'::jsonb,
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.workspace_domains (domain, organization_id)
VALUES (
  'normalized-domain.test',
  (SELECT id FROM normalized_domain_ids WHERE label = 'org')
)
ON CONFLICT (domain) DO UPDATE
SET organization_id = EXCLUDED.organization_id;

SELECT has_index(
  'public',
  'workspace_domains',
  'workspace_domains_normalized_domain_unique',
  'workspace_domains has a unique index on normalized domain'
);

SELECT throws_ok(
  $$
    INSERT INTO public.workspace_domains (domain, organization_id)
    VALUES (
      'Normalized-Domain.TEST',
      '19000000-0000-0000-0000-000000000001'::uuid
    )
  $$,
  '23505',
  NULL,
  'workspace_domains rejects normalized duplicate domains'
);

SELECT lives_ok(
  $$
    SELECT public.get_workspace_onboarding_state(
      '19000000-0000-0000-0000-000000000002'::uuid
    )
  $$,
  'get_workspace_onboarding_state succeeds for claimed normalized domains'
);

SELECT is(
  (
    SELECT workspace_org_id::text
    FROM public.get_workspace_onboarding_state(
      '19000000-0000-0000-0000-000000000002'::uuid
    )
  ),
  '19000000-0000-0000-0000-000000000001',
  'get_workspace_onboarding_state resolves claimed org by normalized domain'
);

SELECT * FROM finish();
ROLLBACK;
