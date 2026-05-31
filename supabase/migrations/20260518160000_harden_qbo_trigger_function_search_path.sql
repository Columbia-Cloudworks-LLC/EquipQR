-- Forward-fix for 20260517100000 which created update_quickbooks_invoice_status_events_updated_at
-- with SET search_path = public instead of the project hardening convention SET search_path = ''.
-- The function body references only built-ins (now(), RETURNS trigger) so an empty search_path
-- is safe and eliminates the function_search_path_mutable Security Advisor advisory.
--
-- Also revokes EXECUTE from PUBLIC, anon, and authenticated since Postgres default privileges
-- grant ALL on new public-schema functions to those roles; trigger functions are invoked by
-- the trigger mechanism, not directly by application roles.
--
-- Idempotent: the DO block skips both the CREATE OR REPLACE and the REVOKE/COMMENT when the
-- function does not exist, so this migration is safe on any environment regardless of
-- migration subset applied.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_quickbooks_invoice_status_events_updated_at'
      AND pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    EXECUTE $body$
      CREATE OR REPLACE FUNCTION public.update_quickbooks_invoice_status_events_updated_at()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = ''
      AS $fn$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $fn$
    $body$;

    REVOKE EXECUTE ON FUNCTION public.update_quickbooks_invoice_status_events_updated_at() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.update_quickbooks_invoice_status_events_updated_at() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.update_quickbooks_invoice_status_events_updated_at() FROM authenticated;

    EXECUTE $c$
      COMMENT ON FUNCTION public.update_quickbooks_invoice_status_events_updated_at() IS
        'Trigger function: sets updated_at = now() on quickbooks_invoice_status_events rows. '
        'SECURITY DEFINER with SET search_path = empty string. Invoked only by trigger mechanism, '
        'not directly by application roles.'
    $c$;
  END IF;
END;
$$;

COMMIT;
