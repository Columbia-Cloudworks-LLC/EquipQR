-- Issue #1122: Audit logs are sensitive, high-privilege compliance data.
-- Restrict read access to organization owners and admins only.
--
-- Before this migration any active organization member could SELECT audit_log
-- rows for their org (and the get_audit_log_timeline aggregator mirrored that
-- check). The UI only ever exposed audit data to owners/admins on purpose-built
-- surfaces, but the database allowed broader reads. Align the database with
-- the product contract:
--   * SELECT policy now requires an active owner/admin membership.
--   * get_audit_log_timeline re-implements the same admin guard (SECURITY
--     DEFINER bypasses RLS, so the check must live in the function body).
-- Write paths are unchanged: direct INSERT stays blocked (log_audit_entry and
-- service-role RPCs are the only writers) and UPDATE/DELETE remain impossible.

-- ---------------------------------------------------------------------------
-- 1. Tighten the SELECT policy.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view audit logs for their organizations" ON "public"."audit_log";

CREATE POLICY "Org owners and admins can view audit logs"
  ON "public"."audit_log"
  FOR SELECT
  TO "authenticated"
  USING (
    "organization_id" IN (
      SELECT "om"."organization_id"
      FROM "public"."organization_members" "om"
      WHERE "om"."user_id" = (SELECT "auth"."uid"())
        AND "om"."status" = 'active'
        AND "om"."role" IN ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Align the timeline aggregator guard with the new policy.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."get_audit_log_timeline"(
  "p_organization_id" "uuid",
  "p_bucket" "text",
  "p_date_from" timestamp with time zone,
  "p_date_to" timestamp with time zone,
  "p_entity_type" "text" DEFAULT NULL::"text",
  "p_action" "text" DEFAULT NULL::"text",
  "p_actor_id" "uuid" DEFAULT NULL::"uuid",
  "p_search" "text" DEFAULT NULL::"text"
) RETURNS TABLE("bucket" timestamp with time zone, "action" "text", "count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Whitelist the bucket unit. Prevents arbitrary date_trunc units from
  -- being passed in via the RPC parameter, which would otherwise widen
  -- the attack surface beyond what the histogram needs.
  IF p_bucket NOT IN ('minute', 'hour', 'day') THEN
    RAISE EXCEPTION 'invalid bucket: %, must be one of minute, hour, day', p_bucket
      USING ERRCODE = '22023';
  END IF;

  -- Owner/admin guard (issue #1122). Mirrors the audit_log SELECT policy.
  -- SECURITY DEFINER bypasses RLS, so the access check must be
  -- re-implemented here.
  IF NOT public.is_org_admin((SELECT auth.uid()), p_organization_id) THEN
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

COMMENT ON FUNCTION "public"."get_audit_log_timeline"("p_organization_id" "uuid", "p_bucket" "text", "p_date_from" timestamp with time zone, "p_date_to" timestamp with time zone, "p_entity_type" "text", "p_action" "text", "p_actor_id" "uuid", "p_search" "text") IS 'Aggregates audit_log entries into time buckets (minute / hour / day) for the organization audit log timeline histogram. Access is restricted to active org owners/admins via is_org_admin because audit data is sensitive high-privilege information (issue #1122); the check is inline because SECURITY DEFINER bypasses RLS. The bucket parameter is whitelisted to prevent arbitrary date_trunc unit injection. Issues #641 / #1122.';
