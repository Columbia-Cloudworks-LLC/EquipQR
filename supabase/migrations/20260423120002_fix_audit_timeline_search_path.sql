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
-- Rollback:
--   ALTER FUNCTION public.get_audit_log_timeline(
--     UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID, TEXT
--   ) SET search_path = public;
-- ============================================================================

BEGIN;

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

COMMIT;
