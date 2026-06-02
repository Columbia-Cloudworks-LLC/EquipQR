-- pgTAP: SECURITY DEFINER EXECUTE grant lockdown (issue #762)

BEGIN;
SELECT plan(7);

-- 1. Only the pre-auth invitation RPC remains callable by anon.
SELECT is(
  (SELECT count(*)::integer
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prosecdef
      AND has_function_privilege('anon', p.oid, 'EXECUTE')),
  1,
  'exactly one public SECURITY DEFINER function is executable by anon'
);

SELECT is(
  (SELECT has_function_privilege(
            'anon',
            'public.get_invitation_by_token_secure(uuid)',
            'EXECUTE')),
  true,
  'anon may execute get_invitation_by_token_secure'
);

-- 2. Representative internal trigger is not REST-callable.
SELECT is(
  (SELECT has_function_privilege(
            'anon',
            'public.audit_equipment_changes()',
            'EXECUTE')),
  false,
  'anon cannot execute audit_equipment_changes trigger helper'
);

SELECT is(
  (SELECT has_function_privilege(
            'authenticated',
            'public.audit_equipment_changes()',
            'EXECUTE')),
  false,
  'authenticated cannot execute audit_equipment_changes trigger helper'
);

-- 3. Dashboard RPC is authenticated-only.
SELECT is(
  (SELECT has_function_privilege(
            'anon',
            'public.get_dashboard_trends(uuid, integer)',
            'EXECUTE')),
  false,
  'anon cannot execute get_dashboard_trends'
);

SELECT is(
  (SELECT has_function_privilege(
            'authenticated',
            'public.get_dashboard_trends(uuid, integer)',
            'EXECUTE')),
  true,
  'authenticated can execute get_dashboard_trends'
);

-- 4. RBAC helper stays off the REST surface.
SELECT is(
  (SELECT has_function_privilege(
            'anon',
            'public.is_org_member(uuid, uuid)',
            'EXECUTE')),
  false,
  'anon cannot execute is_org_member helper'
);

SELECT * FROM finish();
ROLLBACK;
