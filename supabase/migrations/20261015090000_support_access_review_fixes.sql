-- Review follow-ups for owner-granted support access (PR #1654).
--
-- is_org_admin() accepts a live support membership. Two client RPCs used it
-- for decisions that support must not make:
--   * revoke_provisioned_member: removing pending staff is people management.
--   * get_audit_log_timeline: the audit log is excluded from support access.
-- Both now require an active owner/admin via user_is_org_admin(), which never
-- accepts support. Every other SECURITY DEFINER RPC that accepts support is an
-- operational data action (work orders, notes, equipment, inventory, exports,
-- quick forms, check-ins), matching the documented support scope.

CREATE OR REPLACE FUNCTION public.revoke_provisioned_member(p_staged_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT pm.organization_id INTO v_org_id
  FROM public.organization_provisioned_members pm
  WHERE pm.id = p_staged_member_id;

  -- Active owners/admins only: live support (status 'support') is excluded.
  IF v_org_id IS NULL OR NOT public.user_is_org_admin(v_org_id, v_user_id) THEN
    RAISE EXCEPTION 'Staged member not found' USING ERRCODE = '42501';
  END IF;

  UPDATE public.organization_provisioned_members
  SET status = 'revoked',
      revoked_at = now(),
      revoked_by = v_user_id
  WHERE id = p_staged_member_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only pending staged members can be revoked' USING ERRCODE = '22023';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_audit_log_timeline(p_organization_id uuid, p_bucket text, p_date_from timestamp with time zone, p_date_to timestamp with time zone, p_entity_type text DEFAULT NULL::text, p_action text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text)
 RETURNS TABLE(bucket timestamp with time zone, action text, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
  -- Active owners/admins only: live support (status 'support') is excluded.
  IF NOT public.user_is_org_admin(p_organization_id, (SELECT auth.uid())) THEN
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
$function$;
