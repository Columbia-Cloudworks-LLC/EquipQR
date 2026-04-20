-- ============================================================================
-- Migration: Audit Log Timeline Aggregator RPC
--
-- Purpose: Adds public.get_audit_log_timeline RPC that aggregates audit_log
-- event counts into time buckets (minute / hour / day) for the new
-- /audit-log Logflare-style timeline histogram. Mirrors the existing
-- audit_log SELECT RLS via an explicit organization_members membership
-- guard since SECURITY DEFINER bypasses RLS.
--
-- Issue: #641
--
-- Indexing: relies on the existing idx_audit_log_org_time index from
-- 20260115100000_comprehensive_audit_trail.sql. No new index needed.
--
-- Rollback Instructions:
-- To revert this migration, run:
--   BEGIN;
--   DROP FUNCTION IF EXISTS public.get_audit_log_timeline(
--     UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID, TEXT
--   );
--   COMMIT;
-- The function is additive — dropping it does not affect any existing query,
-- trigger, or RLS policy. The audit_log table is untouched.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_audit_log_timeline(
  p_organization_id UUID,
  p_bucket TEXT,
  p_date_from TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ,
  p_entity_type TEXT DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE(bucket TIMESTAMPTZ, action TEXT, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Whitelist the bucket unit. Prevents arbitrary date_trunc units from
  -- being passed in via the RPC parameter, which would otherwise widen
  -- the attack surface beyond what the histogram needs.
  IF p_bucket NOT IN ('minute', 'hour', 'day') THEN
    RAISE EXCEPTION 'invalid bucket: %, must be one of minute, hour, day', p_bucket
      USING ERRCODE = '22023';
  END IF;

  -- Org-membership guard. Mirrors the existing audit_log SELECT policy from
  -- 20260115100000_comprehensive_audit_trail.sql. SECURITY DEFINER bypasses
  -- RLS, so the access check must be re-implemented here. Caller must be
  -- an active member of the organization being queried.
  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = (SELECT auth.uid())
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    date_trunc(p_bucket, al.created_at) AS bucket,
    al.action,
    count(*)::BIGINT AS count
  FROM public.audit_log al
  WHERE al.organization_id = p_organization_id
    AND al.created_at >= p_date_from
    AND al.created_at < p_date_to
    AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_actor_id IS NULL OR al.actor_id = p_actor_id)
    AND (
      p_search IS NULL
      OR al.entity_name ILIKE '%' || p_search || '%'
      OR al.actor_name ILIKE '%' || p_search || '%'
    )
  GROUP BY 1, 2
  ORDER BY 1;
END;
$$;

COMMENT ON FUNCTION public.get_audit_log_timeline(
  UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID, TEXT
) IS
  'Aggregates audit_log entries into time buckets (minute / hour / day) for '
  'the /audit-log Logflare-style timeline histogram. Re-implements the '
  'audit_log SELECT RLS check (organization_members.status = active) inline '
  'because SECURITY DEFINER bypasses RLS. The bucket parameter is whitelisted '
  'to prevent arbitrary date_trunc unit injection. Issue #641.';

GRANT EXECUTE ON FUNCTION public.get_audit_log_timeline(
  UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID, TEXT
) TO authenticated;

COMMIT;
