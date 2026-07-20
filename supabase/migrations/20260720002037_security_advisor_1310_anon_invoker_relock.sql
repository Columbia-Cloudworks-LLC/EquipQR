-- rpc-anon-grant-allowed: get_invitation_by_token_secure, resolve_operator_checkin_by_token, resolve_quick_form_by_token
-- rpc-authenticated-grant-allowed: create_historical_work_order_with_pm
-- ============================================================================
-- Follow-up for issue #1310 (Qodo): make the anon INVOKER lockdown explicit and
-- re-assert authenticated EXECUTE on every create_historical_work_order_with_pm
-- overload (legacy signature without p_timeline_events included).
--
-- Idempotent with 20260719214316_security_advisor_1310_hardening.sql.
-- ============================================================================

DO $anon_relock$
DECLARE
  fn regprocedure;
  anon_allowlist text[] := ARRAY[
    'get_invitation_by_token_secure',
    'resolve_operator_checkin_by_token',
    'resolve_quick_form_by_token'
  ];
  func_name text;
BEGIN
  -- Revoke PUBLIC/anon from every public function (INVOKER + DEFINER).
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
  END LOOP;

  -- Re-open only the intentional three-token anon surface (all overloads).
  FOREACH func_name IN ARRAY anon_allowlist LOOP
    FOR fn IN
      SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.prokind = 'f'
        AND p.prosecdef
        AND p.proname = func_name
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    END LOOP;
  END LOOP;

  -- Historical WO: grant every SECURITY DEFINER overload to authenticated.
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prosecdef
      AND p.proname = 'create_historical_work_order_with_pm'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END;
$anon_relock$;
