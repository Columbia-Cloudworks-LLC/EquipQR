-- ============================================================================
-- Migration: Fix search_path for get_audit_log_timeline
--
-- Context: PR #662, Cursor Bugbot finding (comment 3133443929).
--   get_audit_log_timeline was created with SET search_path = public but the
--   project convention for SECURITY DEFINER functions is
--   SET search_path = public, pg_temp (matching get_dashboard_trends and all
--   other hardened RPCs). The corrective migration 20260423120000 added the
--   missing REVOKE but did not fix this search_path divergence.
--
-- Fix: ALTER FUNCTION to add pg_temp to the search_path without touching the
--   function body, signature, or permissions.
--
-- Idempotent: The ALTER is wrapped in a DO block that first checks pg_proc /
--   pg_namespace for the exact 8-argument signature. If the function is absent
--   (fresh environments, partial rollbacks, signature changes) the block exits
--   silently instead of raising an error.
--
-- Rollback:
--   ALTER FUNCTION public.get_audit_log_timeline(
--     UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID, TEXT
--   ) SET search_path = public;
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_audit_log_timeline'
      AND pg_catalog.pg_get_function_identity_arguments(p.oid) =
          'p_organization_id uuid, p_bucket text, p_date_from timestamp with time zone,'
          ' p_date_to timestamp with time zone, p_entity_type text, p_action text,'
          ' p_actor_id uuid, p_search text'
  ) THEN
    ALTER FUNCTION public.get_audit_log_timeline(
      UUID,
      TEXT,
      TIMESTAMPTZ,
      TIMESTAMPTZ,
      TEXT,
      TEXT,
      UUID,
      TEXT
    ) SET search_path = public, pg_temp;
  END IF;
END;
$$;

COMMIT;
