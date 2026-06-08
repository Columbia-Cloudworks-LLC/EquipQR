BEGIN;
SELECT plan(13);

SELECT has_table('public', 'pm_interval_policies', 'pm_interval_policies table exists');
SELECT has_column('public', 'pm_interval_policies', 'organization_id', 'organization_id exists');
SELECT has_column('public', 'pm_interval_policies', 'scope_type', 'scope_type exists');
SELECT has_column('public', 'pm_interval_policies', 'schedule_mode', 'schedule_mode exists');

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.pm_interval_policies'::regclass),
  'RLS enabled on pm_interval_policies'
);

SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pm_interval_policies'),
  4,
  'pm_interval_policies has four RLS policies'
);

SELECT has_function(
  'public',
  'resolve_effective_pm_interval_policy',
  ARRAY['uuid'],
  'resolve_effective_pm_interval_policy exists'
);

SELECT has_function(
  'public',
  'get_equipment_pm_status',
  ARRAY['uuid'],
  'get_equipment_pm_status exists'
);

SELECT has_function(
  'public',
  'get_effective_pm_interval_policy_for_equipment',
  ARRAY['uuid'],
  'get_effective_pm_interval_policy_for_equipment exists'
);

DELETE FROM public.pm_interval_policies p
WHERE p.organization_id = '660e8400-e29b-41d4-a716-446655440001'::uuid
  AND (
    p.equipment_id = 'aa0e8400-e29b-41d4-a716-446655440010'::uuid
    OR p.team_id = '880e8400-e29b-41d4-a716-446655440002'::uuid
    OR p.pm_template_id = (
      SELECT e.default_pm_template_id
      FROM public.equipment e
      WHERE e.id = 'aa0e8400-e29b-41d4-a716-446655440010'::uuid
    )
  );

-- Service role can resolve policy for seeded equipment with template default interval
SELECT is(
  (
    SELECT r.source
    FROM public.resolve_effective_pm_interval_policy('aa0e8400-e29b-41d4-a716-446655440010'::uuid) r
    LIMIT 1
  ),
  'template_default',
  'Seeded Metro Bobcat resolves template_default interval'
);

-- Team policy overrides template default
INSERT INTO public.pm_interval_policies (
  organization_id,
  scope_type,
  team_id,
  policy_slot,
  schedule_mode,
  interval_value,
  interval_type,
  created_by,
  updated_by
)
SELECT
  '660e8400-e29b-41d4-a716-446655440001'::uuid,
  'team',
  '880e8400-e29b-41d4-a716-446655440002'::uuid,
  'default',
  'custom',
  45,
  'days',
  'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
  'bb0e8400-e29b-41d4-a716-446655440004'::uuid
WHERE EXISTS (
  SELECT 1 FROM public.teams WHERE id = '880e8400-e29b-41d4-a716-446655440002'::uuid
);

SELECT is(
  (
    SELECT r.interval_value
    FROM public.resolve_effective_pm_interval_policy('aa0e8400-e29b-41d4-a716-446655440010'::uuid) r
    LIMIT 1
  ),
  45,
  'Team policy overrides template default for inherited equipment'
);

SELECT is(
  (
    SELECT r.source
    FROM public.resolve_effective_pm_interval_policy('aa0e8400-e29b-41d4-a716-446655440010'::uuid) r
    LIMIT 1
  ),
  'team_policy',
  'Resolver reports team_policy source'
);

-- Equipment none suppresses recurring schedule
INSERT INTO public.pm_interval_policies (
  organization_id,
  scope_type,
  equipment_id,
  policy_slot,
  schedule_mode,
  interval_value,
  interval_type,
  created_by,
  updated_by
) VALUES (
  '660e8400-e29b-41d4-a716-446655440001'::uuid,
  'equipment',
  'aa0e8400-e29b-41d4-a716-446655440010'::uuid,
  'default',
  'none',
  NULL,
  NULL,
  'bb0e8400-e29b-41d4-a716-446655440004'::uuid,
  'bb0e8400-e29b-41d4-a716-446655440004'::uuid
)
ON CONFLICT DO NOTHING;

SELECT is(
  (
    SELECT count(*)::int
    FROM public.resolve_effective_pm_interval_policy('aa0e8400-e29b-41d4-a716-446655440010'::uuid)
  ),
  0,
  'Equipment none policy suppresses recurring schedule'
);

SELECT * FROM finish();
ROLLBACK;
