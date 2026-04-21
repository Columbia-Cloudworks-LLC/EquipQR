-- Migration: add dashboard trends RPC for issue #589
-- Purpose: replace synthetic dashboard sparklines and trend chips with real
-- historical data sourced from existing tables (equipment, work_orders).
--
-- Design notes:
--   * Single RPC returns 7-day sparklines + 7-vs-prior-7 deltas for the four
--     KPIs rendered by DashboardStatsGrid.tsx (Total Equipment, Overdue Work,
--     Total Work Orders, Needs Attention).
--   * SECURITY DEFINER + explicit SET search_path follows the project's
--     advisor-compliant pattern (see 20251119210834_fix_security_warnings.sql
--     and 20260401121500_fix_dsr_function_search_path_warnings.sql).
--   * Team scoping mirrors getTeamBasedDashboardStats(): org admins see the
--     whole org; non-admin members are scoped to teams they belong to. This is
--     derived server-side from auth.uid() (client scope params are accepted for
--     API compatibility but not trusted for authorization).
--   * No new indexes are added in this migration. work_orders
--     (organization_id, created_date) and equipment (organization_id,
--     created_at) are already covered by prior performance migrations
--     (20250902123800_performance_optimization.sql,
--     20251027234423_rls_performance_indexes.sql). EXPLAIN ANALYZE should be
--     re-run pre-merge and indexes added in a follow-up only if warranted.

-- Return type: one row, four metrics × (series + delta).
-- Series are arrays of length p_days ordered oldest -> newest ending today.
-- Delta is integer percent change (current window sum/avg vs prior window).
-- Delta is NULL when prior window is zero or empty (UI should suppress chip).
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
  -- Tenant guard: require caller to be a member of the org.
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
  -- Accessible equipment IDs (mirrors EquipmentService.getAccessibleEquipmentIds)
  -- while enforcing scope with server-derived permissions.
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
  -- One row per day in the 2-window range we need (current + prior).
  day_series AS (
    SELECT generate_series(v_prior_start, v_today, interval '1 day')::date AS day
  ),
  equipment_daily_created AS (
    SELECT
      e.created_day AS day,
      count(*)::integer AS total_new,
      count(*) FILTER (WHERE e.status IN ('maintenance', 'inactive'))::integer AS needs_attention_new
    FROM accessible_equipment e
    GROUP BY e.created_day
  ),
  -- Total equipment and needs-attention snapshots by day.
  eq_daily AS (
    SELECT
      d.day,
      SUM(COALESCE(ed.total_new, 0)) OVER (ORDER BY d.day)::integer AS total_equipment,
      SUM(COALESCE(ed.needs_attention_new, 0)) OVER (ORDER BY d.day)::integer AS needs_attention
    FROM day_series d
    LEFT JOIN equipment_daily_created ed ON ed.day = d.day
  ),
  work_orders_daily_created AS (
    SELECT
      w.created_day AS day,
      count(*)::integer AS total_new
    FROM accessible_wo w
    GROUP BY w.created_day
  ),
  -- Work orders: cumulative total created.
  wo_daily_created AS (
    SELECT
      d.day,
      SUM(COALESCE(wd.total_new, 0)) OVER (ORDER BY d.day)::integer AS total_work_orders
    FROM day_series d
    LEFT JOIN work_orders_daily_created wd ON wd.day = d.day
  ),
  -- Overdue snapshot by day via interval events (+1 at due_day, -1 after end_day).
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
      -- Cumulative metrics compare "new in current window" vs "new in prior window".
      COALESCE(SUM(total_new) FILTER (WHERE day BETWEEN v_window_start AND v_today), 0) AS te_curr_window,
      COALESCE(SUM(total_new) FILTER (WHERE day BETWEEN v_prior_start AND v_prior_end), 0) AS te_prior_window,
      COALESCE(SUM(needs_attention_new) FILTER (WHERE day BETWEEN v_window_start AND v_today), 0) AS na_curr_window,
      COALESCE(SUM(needs_attention_new) FILTER (WHERE day BETWEEN v_prior_start AND v_prior_end), 0) AS na_prior_window,
      COALESCE(SUM(wo_new) FILTER (WHERE day BETWEEN v_window_start AND v_today), 0) AS twos_curr_window,
      COALESCE(SUM(wo_new) FILTER (WHERE day BETWEEN v_prior_start AND v_prior_end), 0) AS twos_prior_window,
      -- Overdue is a snapshot metric: average across window vs prior window.
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
    -- total_equipment
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

    -- overdue_work (lower is better; direction reflects raw change)
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

    -- total_work_orders
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

    -- needs_attention
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
  'Team scope is derived server-side from auth.uid() and org/team membership. '
  'Tenant isolation enforced by public.is_org_member() check. See issue #589.';

REVOKE ALL ON FUNCTION public.get_dashboard_trends(uuid, uuid[], boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_trends(uuid, uuid[], boolean, integer) TO authenticated;
