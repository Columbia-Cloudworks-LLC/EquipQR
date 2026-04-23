-- ============================================================================
-- Migration: Fix RPC security hardening + sparkline baseline offsets
--
-- Addresses two issues flagged in PR #662 code review:
--
-- Fix 1 (security): Revoke PUBLIC execute on get_audit_log_timeline.
--   The original migration granted EXECUTE to `authenticated` but did not
--   revoke the default PUBLIC privilege, diverging from the hardened pattern
--   already used by get_dashboard_trends. SECURITY DEFINER functions with an
--   internal membership guard should still have the smallest callable surface.
--
-- Fix 2 (correctness): Recreate get_dashboard_trends with baseline offsets so
--   sparkline series reflect actual running totals for established orgs rather
--   than starting at 0 for rows created before the look-back window.
--   Adds baseline_equipment and baseline_wo CTEs that count accessible rows
--   created before v_prior_start and add them as a CROSS JOIN offset to the
--   existing running-sum CTEs (eq_daily, wo_daily_created).
--
-- Rollback Instructions:
--   Fix 1: GRANT EXECUTE ON FUNCTION public.get_audit_log_timeline(...) TO PUBLIC;
--   Fix 2: Redeploy the version from 20260421180000_add_dashboard_trends_rpc.sql
-- ============================================================================

BEGIN;

-- Fix 1: Revoke PUBLIC execute from get_audit_log_timeline.
-- The internal org-membership guard prevents data leakage, but leaving PUBLIC
-- execute enabled widens the callable surface unnecessarily.
REVOKE ALL ON FUNCTION public.get_audit_log_timeline(
  UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID, TEXT
) FROM PUBLIC;

-- Fix 2: Recreate get_dashboard_trends with baseline offsets so sparklines for
-- established orgs show realistic totals rather than "new in window only" counts.
CREATE OR REPLACE FUNCTION public.get_dashboard_trends(
  p_org_id uuid,
  p_team_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_is_manager boolean DEFAULT false,
  p_days integer DEFAULT 7
)
RETURNS TABLE (
  total_equipment_series integer[],
  total_equipment_delta integer,
  total_equipment_direction text,
  overdue_work_series integer[],
  overdue_work_delta integer,
  overdue_work_direction text,
  total_work_orders_series integer[],
  total_work_orders_delta integer,
  total_work_orders_direction text,
  needs_attention_series integer[],
  needs_attention_delta integer,
  needs_attention_direction text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_days integer := GREATEST(LEAST(COALESCE(p_days, 7), 90), 2);
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_window_start date := v_today - (v_days - 1);
  v_prior_end date := v_window_start - 1;
  v_prior_start date := v_prior_end - (v_days - 1);
BEGIN
  IF NOT public.is_org_member(auth.uid(), p_org_id) THEN
    RAISE EXCEPTION 'Not a member of organization %', p_org_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH
  request_context AS (
    SELECT
      auth.uid() AS user_id,
      public.is_org_admin(auth.uid(), p_org_id) AS is_org_admin
  ),
  accessible_team_ids AS (
    SELECT tm.team_id
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    JOIN request_context rc ON true
    WHERE tm.user_id = rc.user_id
      AND t.organization_id = p_org_id
  ),
  accessible_equipment AS (
    SELECT e.id, e.status, e.created_at::date AS created_day
    FROM public.equipment e
    JOIN request_context rc ON true
    WHERE e.organization_id = p_org_id
      AND (
        rc.is_org_admin
        OR (
          e.team_id IS NOT NULL
          AND e.team_id IN (SELECT team_id FROM accessible_team_ids)
        )
      )
  ),
  accessible_wo AS (
    SELECT
      w.id,
      w.status,
      w.created_date::date AS created_day,
      w.due_date::date AS due_day,
      w.completed_date::date AS completed_day
    FROM public.work_orders w
    WHERE w.organization_id = p_org_id
      AND w.equipment_id IN (SELECT id FROM accessible_equipment)
  ),
  day_series AS (
    SELECT generate_series(v_prior_start, v_today, interval '1 day')::date AS day
  ),
  -- Baselines: count rows created before the 2-window range so sparklines
  -- start from actual totals rather than 0 for established orgs.
  -- Note: needs_attention baseline uses current status (a known approximation;
  -- true historical status tracking requires a separate status-history table).
  baseline_equipment AS (
    SELECT
      count(*)::integer AS total,
      count(*) FILTER (WHERE status IN ('maintenance', 'inactive'))::integer AS needs_attention
    FROM accessible_equipment
    WHERE created_day < v_prior_start
  ),
  baseline_wo AS (
    SELECT count(*)::integer AS total
    FROM accessible_wo
    WHERE created_day < v_prior_start
  ),
  equipment_daily_created AS (
    SELECT
      e.created_day AS day,
      count(*)::integer AS total_new,
      count(*) FILTER (WHERE e.status IN ('maintenance', 'inactive'))::integer AS needs_attention_new
    FROM accessible_equipment e
    GROUP BY e.created_day
  ),
  eq_daily AS (
    SELECT
      d.day,
      (b.total + SUM(COALESCE(ed.total_new, 0)) OVER (ORDER BY d.day))::integer AS total_equipment,
      (b.needs_attention + SUM(COALESCE(ed.needs_attention_new, 0)) OVER (ORDER BY d.day))::integer AS needs_attention
    FROM day_series d
    CROSS JOIN baseline_equipment b
    LEFT JOIN equipment_daily_created ed ON ed.day = d.day
  ),
  work_orders_daily_created AS (
    SELECT
      w.created_day AS day,
      count(*)::integer AS total_new
    FROM accessible_wo w
    GROUP BY w.created_day
  ),
  wo_daily_created AS (
    SELECT
      d.day,
      (b.total + SUM(COALESCE(wd.total_new, 0)) OVER (ORDER BY d.day))::integer AS total_work_orders
    FROM day_series d
    CROSS JOIN baseline_wo b
    LEFT JOIN work_orders_daily_created wd ON wd.day = d.day
  ),
  overdue_events AS (
    SELECT
      e.event_day,
      SUM(e.delta)::integer AS net_delta
    FROM (
      SELECT
        GREATEST(w.due_day, v_prior_start) AS event_day,
        1 AS delta
      FROM accessible_wo w
      WHERE w.due_day IS NOT NULL
        AND w.status NOT IN ('completed', 'cancelled')
        AND COALESCE(w.completed_day - 1, v_today) >= GREATEST(w.due_day, v_prior_start)

      UNION ALL

      SELECT
        LEAST(COALESCE(w.completed_day - 1, v_today), v_today) + 1 AS event_day,
        -1 AS delta
      FROM accessible_wo w
      WHERE w.due_day IS NOT NULL
        AND w.status NOT IN ('completed', 'cancelled')
        AND COALESCE(w.completed_day - 1, v_today) >= GREATEST(w.due_day, v_prior_start)
        AND LEAST(COALESCE(w.completed_day - 1, v_today), v_today) + 1 <= v_today
    ) e
    GROUP BY e.event_day
  ),
  overdue_daily AS (
    SELECT
      d.day,
      SUM(COALESCE(oe.net_delta, 0)) OVER (ORDER BY d.day)::integer AS overdue_work
    FROM day_series d
    LEFT JOIN overdue_events oe ON oe.event_day = d.day
  ),
  merged AS (
    SELECT
      d.day,
      eq.total_equipment,
      eq.needs_attention,
      wc.total_work_orders,
      od.overdue_work
    FROM day_series d
    JOIN eq_daily eq ON eq.day = d.day
    JOIN wo_daily_created wc ON wc.day = d.day
    JOIN overdue_daily od ON od.day = d.day
  ),
  current_agg AS (
    SELECT
      array_agg(total_equipment ORDER BY day) FILTER (WHERE day >= v_window_start) AS te_series,
      array_agg(needs_attention ORDER BY day) FILTER (WHERE day >= v_window_start) AS na_series,
      array_agg(total_work_orders ORDER BY day) FILTER (WHERE day >= v_window_start) AS twos_series,
      array_agg(overdue_work ORDER BY day) FILTER (WHERE day >= v_window_start) AS ow_series,
      -- Delta compares new-in-current-window vs new-in-prior-window (incremental
      -- change, not affected by the baseline offset added to the sparkline series).
      COALESCE(SUM(total_new) FILTER (WHERE day BETWEEN v_window_start AND v_today), 0) AS te_curr_window,
      COALESCE(SUM(total_new) FILTER (WHERE day BETWEEN v_prior_start AND v_prior_end), 0) AS te_prior_window,
      COALESCE(SUM(needs_attention_new) FILTER (WHERE day BETWEEN v_window_start AND v_today), 0) AS na_curr_window,
      COALESCE(SUM(needs_attention_new) FILTER (WHERE day BETWEEN v_prior_start AND v_prior_end), 0) AS na_prior_window,
      COALESCE(SUM(wo_new) FILTER (WHERE day BETWEEN v_window_start AND v_today), 0) AS twos_curr_window,
      COALESCE(SUM(wo_new) FILTER (WHERE day BETWEEN v_prior_start AND v_prior_end), 0) AS twos_prior_window,
      avg(overdue_work) FILTER (WHERE day >= v_window_start) AS ow_curr_avg,
      avg(overdue_work) FILTER (WHERE day <  v_window_start) AS ow_prior_avg
    FROM (
      SELECT
        m.*,
        COALESCE(ed.total_new, 0)::integer AS total_new,
        COALESCE(ed.needs_attention_new, 0)::integer AS needs_attention_new,
        COALESCE(wd.total_new, 0)::integer AS wo_new
      FROM merged m
      LEFT JOIN equipment_daily_created ed ON ed.day = m.day
      LEFT JOIN work_orders_daily_created wd ON wd.day = m.day
    ) daily
  )
  SELECT
    te_series::integer[] AS total_equipment_series,
    CASE
      WHEN te_prior_window = 0 THEN NULL
      ELSE round(((te_curr_window - te_prior_window)::numeric / te_prior_window::numeric) * 100)::integer
    END AS total_equipment_delta,
    CASE
      WHEN te_prior_window = 0 THEN 'flat'
      WHEN te_curr_window > te_prior_window THEN 'up'
      WHEN te_curr_window < te_prior_window THEN 'down'
      ELSE 'flat'
    END AS total_equipment_direction,

    ow_series::integer[] AS overdue_work_series,
    CASE
      WHEN ow_prior_avg IS NULL OR ow_prior_avg = 0 THEN NULL
      ELSE round(((COALESCE(ow_curr_avg, 0) - ow_prior_avg) / ow_prior_avg) * 100)::integer
    END AS overdue_work_delta,
    CASE
      WHEN ow_prior_avg IS NULL OR ow_prior_avg = 0 THEN 'flat'
      WHEN COALESCE(ow_curr_avg, 0) > ow_prior_avg THEN 'up'
      WHEN COALESCE(ow_curr_avg, 0) < ow_prior_avg THEN 'down'
      ELSE 'flat'
    END AS overdue_work_direction,

    twos_series::integer[] AS total_work_orders_series,
    CASE
      WHEN twos_prior_window = 0 THEN NULL
      ELSE round(((twos_curr_window - twos_prior_window)::numeric / twos_prior_window::numeric) * 100)::integer
    END AS total_work_orders_delta,
    CASE
      WHEN twos_prior_window = 0 THEN 'flat'
      WHEN twos_curr_window > twos_prior_window THEN 'up'
      WHEN twos_curr_window < twos_prior_window THEN 'down'
      ELSE 'flat'
    END AS total_work_orders_direction,

    na_series::integer[] AS needs_attention_series,
    CASE
      WHEN na_prior_window = 0 THEN NULL
      ELSE round(((na_curr_window - na_prior_window)::numeric / na_prior_window::numeric) * 100)::integer
    END AS needs_attention_delta,
    CASE
      WHEN na_prior_window = 0 THEN 'flat'
      WHEN na_curr_window > na_prior_window THEN 'up'
      WHEN na_curr_window < na_prior_window THEN 'down'
      ELSE 'flat'
    END AS needs_attention_direction
  FROM current_agg;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_trends(uuid, uuid[], boolean, integer) IS
  'Dashboard sparkline + trend data for the four StatsGrid KPIs. '
  'Single-round-trip RPC returning p_days-length series and window deltas. '
  'Sparklines include baseline offsets so series start from actual org totals. '
  'Team scope is derived server-side from auth.uid() and org/team membership. '
  'Tenant isolation enforced by public.is_org_member() check. See issue #589.';

REVOKE ALL ON FUNCTION public.get_dashboard_trends(uuid, uuid[], boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_trends(uuid, uuid[], boolean, integer) TO authenticated;

COMMIT;
