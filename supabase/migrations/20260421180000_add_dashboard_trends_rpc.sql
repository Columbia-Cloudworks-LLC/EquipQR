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
--   * Team scoping mirrors getTeamBasedDashboardStats(): managers (p_is_manager
--     = true) see the whole org; otherwise, rows are restricted to equipment
--     whose team_id is in p_team_ids. work_orders are scoped by their
--     equipment_id (same pattern as the existing service).
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
  -- Accessible equipment IDs (mirrors EquipmentService.getAccessibleEquipmentIds).
  accessible_equipment AS (
    SELECT e.id, e.status, e.created_at
    FROM public.equipment e
    WHERE e.organization_id = p_org_id
      AND (
        p_is_manager
        OR (e.team_id IS NOT NULL AND e.team_id = ANY(p_team_ids))
      )
  ),
  accessible_wo AS (
    SELECT w.id, w.status, w.created_date, w.due_date, w.completed_date
    FROM public.work_orders w
    WHERE w.organization_id = p_org_id
      AND w.equipment_id IN (SELECT id FROM accessible_equipment)
  ),
  -- One row per day in the 2-window range we need (current + prior).
  day_series AS (
    SELECT generate_series(v_prior_start, v_today, interval '1 day')::date AS day
  ),
  -- Total equipment: cumulative count of equipment created on or before each day.
  eq_daily AS (
    SELECT
      d.day,
      (
        SELECT count(*)::integer
        FROM accessible_equipment e
        WHERE e.created_at::date <= d.day
      ) AS total_equipment,
      (
        SELECT count(*)::integer
        FROM accessible_equipment e
        WHERE e.created_at::date <= d.day
          AND e.status IN ('maintenance', 'inactive')
      ) AS needs_attention
    FROM day_series d
  ),
  -- Work orders: cumulative total created, and snapshot of overdue-as-of-day.
  -- Overdue = due_date <= day AND (completed_date IS NULL OR completed_date > day)
  --          AND status was not cancelled as of that day. For simplicity and
  --          auditability we use current status to filter cancelled; this is
  --          consistent with how getTeamBasedDashboardStats defines overdue.
  wo_daily AS (
    SELECT
      d.day,
      (
        SELECT count(*)::integer
        FROM accessible_wo w
        WHERE w.created_date::date <= d.day
      ) AS total_work_orders,
      (
        SELECT count(*)::integer
        FROM accessible_wo w
        WHERE w.due_date IS NOT NULL
          AND w.due_date::date <= d.day
          AND (w.completed_date IS NULL OR w.completed_date::date > d.day)
          AND w.status NOT IN ('completed', 'cancelled')
      ) AS overdue_work
    FROM day_series d
  ),
  merged AS (
    SELECT
      d.day,
      eq.total_equipment,
      eq.needs_attention,
      wo.total_work_orders,
      wo.overdue_work,
      (d.day >= v_window_start) AS in_current,
      (d.day <  v_window_start) AS in_prior
    FROM day_series d
    JOIN eq_daily eq ON eq.day = d.day
    JOIN wo_daily wo ON wo.day = d.day
  ),
  current_agg AS (
    SELECT
      array_agg(total_equipment ORDER BY day)     AS te_series,
      array_agg(needs_attention ORDER BY day)     AS na_series,
      array_agg(total_work_orders ORDER BY day)   AS twos_series,
      array_agg(overdue_work ORDER BY day)        AS ow_series,
      -- Use end-of-window snapshot for current, start-of-window for prior.
      max(total_equipment)   FILTER (WHERE day = v_today)         AS te_end,
      max(total_equipment)   FILTER (WHERE day = v_window_start)  AS te_start,
      max(needs_attention)   FILTER (WHERE day = v_today)         AS na_end,
      max(needs_attention)   FILTER (WHERE day = v_window_start)  AS na_start,
      max(total_work_orders) FILTER (WHERE day = v_today)         AS twos_end,
      max(total_work_orders) FILTER (WHERE day = v_window_start)  AS twos_start,
      -- Overdue is a snapshot metric: average across window vs prior window.
      avg(overdue_work)      FILTER (WHERE day >= v_window_start) AS ow_curr_avg,
      avg(overdue_work)      FILTER (WHERE day <  v_window_start) AS ow_prior_avg
    FROM merged
  )
  SELECT
    -- total_equipment
    (te_series)[v_days + 1 : 2 * v_days]::integer[] AS total_equipment_series,
    CASE
      WHEN te_start IS NULL OR te_start = 0 THEN NULL
      ELSE round(((te_end - te_start)::numeric / NULLIF(te_start, 0)::numeric) * 100)::integer
    END AS total_equipment_delta,
    CASE
      WHEN te_start IS NULL OR te_start = 0 THEN 'flat'
      WHEN te_end > te_start THEN 'up'
      WHEN te_end < te_start THEN 'down'
      ELSE 'flat'
    END AS total_equipment_direction,

    -- overdue_work (lower is better; direction reflects raw change)
    (ow_series)[v_days + 1 : 2 * v_days]::integer[] AS overdue_work_series,
    CASE
      WHEN ow_prior_avg IS NULL OR ow_prior_avg = 0 THEN NULL
      ELSE round(((COALESCE(ow_curr_avg,0) - ow_prior_avg) / NULLIF(ow_prior_avg,0)) * 100)::integer
    END AS overdue_work_delta,
    CASE
      WHEN ow_prior_avg IS NULL OR ow_prior_avg = 0 THEN 'flat'
      WHEN COALESCE(ow_curr_avg,0) > ow_prior_avg THEN 'up'
      WHEN COALESCE(ow_curr_avg,0) < ow_prior_avg THEN 'down'
      ELSE 'flat'
    END AS overdue_work_direction,

    -- total_work_orders
    (twos_series)[v_days + 1 : 2 * v_days]::integer[] AS total_work_orders_series,
    CASE
      WHEN twos_start IS NULL OR twos_start = 0 THEN NULL
      ELSE round(((twos_end - twos_start)::numeric / NULLIF(twos_start,0)::numeric) * 100)::integer
    END AS total_work_orders_delta,
    CASE
      WHEN twos_start IS NULL OR twos_start = 0 THEN 'flat'
      WHEN twos_end > twos_start THEN 'up'
      WHEN twos_end < twos_start THEN 'down'
      ELSE 'flat'
    END AS total_work_orders_direction,

    -- needs_attention
    (na_series)[v_days + 1 : 2 * v_days]::integer[] AS needs_attention_series,
    CASE
      WHEN na_start IS NULL OR na_start = 0 THEN NULL
      ELSE round(((na_end - na_start)::numeric / NULLIF(na_start,0)::numeric) * 100)::integer
    END AS needs_attention_delta,
    CASE
      WHEN na_start IS NULL OR na_start = 0 THEN 'flat'
      WHEN na_end > na_start THEN 'up'
      WHEN na_end < na_start THEN 'down'
      ELSE 'flat'
    END AS needs_attention_direction
  FROM current_agg;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_trends(uuid, uuid[], boolean, integer) IS
  'Dashboard sparkline + trend data for the four StatsGrid KPIs. '
  'Single-round-trip RPC returning p_days-length series and window deltas. '
  'Team-scoped via (p_team_ids, p_is_manager) to match getTeamBasedDashboardStats. '
  'Tenant isolation enforced by public.is_org_member() check. See issue #589.';

REVOKE ALL ON FUNCTION public.get_dashboard_trends(uuid, uuid[], boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_trends(uuid, uuid[], boolean, integer) TO authenticated;
