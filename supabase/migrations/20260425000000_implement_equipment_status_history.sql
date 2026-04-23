-- ============================================================================
-- Migration: Implement equipment_status_history
--
-- Delivers the plan documented in the tracking stub
-- 20260424000000_equipment_status_history.sql.
--
-- Closes: #664  feat(dashboard): needs_attention sparkline should reflect
--              historical equipment status, not current status
--
-- Changes
-- -------
-- 1. Table    — public.equipment_status_history
-- 2. Index    — (equipment_id, changed_at) for point-in-time RPC lookups
-- 3. Trigger  — AFTER UPDATE on public.equipment to record every status change
-- 4. Backfill — one synthetic "created" row per existing equipment row
-- 5. RLS      — SELECT for org members; INSERT reserved for the trigger only
-- 6. RPC      — Recreate get_dashboard_trends to derive needs_attention counts
--               from equipment_status_history instead of current status
--
-- Rollback Instructions
-- ---------------------
--   DROP TRIGGER IF EXISTS trg_equipment_status_history ON public.equipment;
--   DROP FUNCTION IF EXISTS public.record_equipment_status_change();
--   DROP TABLE IF EXISTS public.equipment_status_history;
--   Then redeploy get_dashboard_trends from
--     20260423120001_remove_dead_params_from_dashboard_trends_rpc.sql.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.equipment_status_history (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid         NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  old_status   text,
  new_status   text         NOT NULL,
  changed_at   timestamptz  NOT NULL DEFAULT now(),
  changed_by   uuid         REFERENCES public.profiles(id)
);

COMMENT ON TABLE public.equipment_status_history IS
  'Per-row log of every status transition on public.equipment. '
  'Populated by trg_equipment_status_history (AFTER UPDATE trigger) and by the '
  'one-time backfill in this migration. Used by get_dashboard_trends to compute '
  'point-in-time needs_attention counts instead of back-projecting current status.';

COMMENT ON COLUMN public.equipment_status_history.old_status IS
  'Status before the transition. NULL for the synthetic "created" backfill row.';
COMMENT ON COLUMN public.equipment_status_history.changed_by IS
  'auth.uid() at the time of the change. NULL for backfilled rows.';

-- ============================================================================
-- 2. Index
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_equipment_status_history_equipment_changed_at
  ON public.equipment_status_history (equipment_id, changed_at);

-- ============================================================================
-- 3. Trigger function + trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_equipment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.equipment_status_history
      (equipment_id, old_status, new_status, changed_at, changed_by)
    VALUES
      (NEW.id, OLD.status, NEW.status, now(), auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_equipment_status_history ON public.equipment;
CREATE TRIGGER trg_equipment_status_history
  AFTER UPDATE ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.record_equipment_status_change();

-- ============================================================================
-- 4. Backfill — one synthetic row per existing equipment row.
--    Uses created_at as the first known transition timestamp and current status
--    as new_status (old_status = NULL signals this is a synthetic origin row).
--    ON CONFLICT DO NOTHING is a no-op guard; the table is new, but keeps
--    this safe if the migration is ever partially re-applied.
-- ============================================================================

INSERT INTO public.equipment_status_history
  (equipment_id, old_status, new_status, changed_at, changed_by)
SELECT
  id,
  NULL,
  status,
  created_at,
  NULL
FROM public.equipment
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. RLS
-- ============================================================================

ALTER TABLE public.equipment_status_history ENABLE ROW LEVEL SECURITY;

-- Authenticated org members may read history for equipment they can access.
DROP POLICY IF EXISTS "esh_select_org_member" ON public.equipment_status_history;
CREATE POLICY "esh_select_org_member"
  ON public.equipment_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.equipment e
      WHERE e.id = equipment_status_history.equipment_id
        AND public.is_org_member(auth.uid(), e.organization_id)
    )
  );

-- INSERT is intentionally not exposed to authenticated callers.
-- All writes happen via the SECURITY DEFINER trigger above.

GRANT SELECT ON public.equipment_status_history TO authenticated;
GRANT ALL    ON public.equipment_status_history TO service_role;

-- ============================================================================
-- 6. Recreate get_dashboard_trends with point-in-time needs_attention
--
--    Key changes from the previous version:
--    * accessible_equipment no longer selects e.status — status comes from
--      equipment_status_history.
--    * New CTE status_intervals builds [valid_from, valid_until] date ranges
--      per equipment_id via LEAD window function.
--    * New CTE needs_attention_daily joins day_series with status_intervals
--      for a per-day count of equipment whose status was needs_attention ON
--      that day (point-in-time), not what it is today.
--    * needs_attention is now a snapshot metric (like overdue_work), so its
--      delta is computed as avg(current window) vs avg(prior window) rather
--      than sum of new entries — this is more meaningful and correct.
--    * baseline_equipment no longer needs a needs_attention column because
--      the baseline is included naturally by status_intervals (pre-window rows
--      have valid_from < v_prior_start and their interval spans into the window).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_trends(
  p_org_id uuid,
  p_days   integer DEFAULT 7
)
RETURNS TABLE (
  total_equipment_series   integer[],
  total_equipment_delta    integer,
  total_equipment_direction text,
  overdue_work_series      integer[],
  overdue_work_delta       integer,
  overdue_work_direction   text,
  total_work_orders_series integer[],
  total_work_orders_delta  integer,
  total_work_orders_direction text,
  needs_attention_series   integer[],
  needs_attention_delta    integer,
  needs_attention_direction text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_days         integer := GREATEST(LEAST(COALESCE(p_days, 7), 90), 2);
  v_today        date    := (now() AT TIME ZONE 'UTC')::date;
  v_window_start date    := v_today - (v_days - 1);
  v_prior_end    date    := v_window_start - 1;
  v_prior_start  date    := v_prior_end - (v_days - 1);
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
  -- Note: e.status is intentionally not selected here; status by day is
  -- derived from equipment_status_history via status_intervals below.
  accessible_equipment AS (
    SELECT e.id, e.created_at::date AS created_day
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
      w.due_date::date     AS due_day,
      w.completed_date::date AS completed_day
    FROM public.work_orders w
    WHERE w.organization_id = p_org_id
      AND w.equipment_id IN (SELECT id FROM accessible_equipment)
  ),
  day_series AS (
    SELECT generate_series(v_prior_start, v_today, interval '1 day')::date AS day
  ),
  -- Baseline: equipment created before the 2-window range (for total_equipment
  -- sparkline). needs_attention baseline is handled naturally by status_intervals
  -- because pre-window rows have valid_from < v_prior_start and their interval
  -- extends into the window.
  baseline_equipment AS (
    SELECT count(*)::integer AS total
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
      count(*)::integer AS total_new
    FROM accessible_equipment e
    GROUP BY e.created_day
  ),
  -- Cumulative total_equipment sparkline with baseline offset.
  eq_daily AS (
    SELECT
      d.day,
      (b.total + SUM(COALESCE(ed.total_new, 0)) OVER (ORDER BY d.day))::integer AS total_equipment
    FROM day_series d
    CROSS JOIN baseline_equipment b
    LEFT JOIN equipment_daily_created ed ON ed.day = d.day
  ),
  -- Point-in-time status intervals from equipment_status_history.
  -- Each row represents: equipment_id had new_status from valid_from through
  -- valid_until (the day before the next recorded transition, or 'infinity').
  -- When two changes occur on the same calendar day, LEAD produces
  -- valid_until = valid_from - 1 (empty interval) for the earlier change,
  -- so only the last change of the day is matched in the range join below.
  status_intervals AS (
    SELECT
      h.equipment_id,
      h.new_status,
      h.changed_at::date AS valid_from,
      COALESCE(
        LEAD(h.changed_at::date) OVER (
          PARTITION BY h.equipment_id ORDER BY h.changed_at
        ) - 1,
        'infinity'::date
      ) AS valid_until
    FROM public.equipment_status_history h
    WHERE h.equipment_id IN (SELECT id FROM accessible_equipment)
  ),
  -- Count of accessible equipment in a needs_attention state on each day
  -- via an interval range join — the actual status each item had on that day.
  needs_attention_daily AS (
    SELECT
      d.day,
      count(si.equipment_id) FILTER (
        WHERE si.new_status IN ('maintenance', 'inactive')
      )::integer AS needs_attention
    FROM day_series d
    LEFT JOIN status_intervals si ON d.day BETWEEN si.valid_from AND si.valid_until
    GROUP BY d.day
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
      -- A work order becomes overdue on its due_day (or the start of our window,
      -- whichever is later). Completed/cancelled WOs are included only when they
      -- have a completed_date that bounds the overdue period. WOs with
      -- status IN ('completed','cancelled') AND completed_date IS NULL are
      -- excluded — COALESCE would default to v_today, making them appear
      -- perpetually overdue.
      SELECT
        GREATEST(w.due_day, v_prior_start) AS event_day,
        1 AS delta
      FROM accessible_wo w
      WHERE w.due_day IS NOT NULL
        AND (w.status NOT IN ('completed', 'cancelled') OR w.completed_day IS NOT NULL)
        AND COALESCE(w.completed_day - 1, v_today) >= GREATEST(w.due_day, v_prior_start)

      UNION ALL

      -- The overdue period ends the day after the last overdue day
      -- (completed_day - 1, or today if still open).
      SELECT
        LEAST(COALESCE(w.completed_day - 1, v_today), v_today) + 1 AS event_day,
        -1 AS delta
      FROM accessible_wo w
      WHERE w.due_day IS NOT NULL
        AND (w.status NOT IN ('completed', 'cancelled') OR w.completed_day IS NOT NULL)
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
      nad.needs_attention,
      wc.total_work_orders,
      od.overdue_work
    FROM day_series d
    JOIN eq_daily           eq  ON eq.day  = d.day
    JOIN needs_attention_daily nad ON nad.day = d.day
    JOIN wo_daily_created   wc  ON wc.day  = d.day
    JOIN overdue_daily      od  ON od.day  = d.day
  ),
  current_agg AS (
    SELECT
      array_agg(total_equipment   ORDER BY day) FILTER (WHERE day >= v_window_start) AS te_series,
      array_agg(needs_attention   ORDER BY day) FILTER (WHERE day >= v_window_start) AS na_series,
      array_agg(total_work_orders ORDER BY day) FILTER (WHERE day >= v_window_start) AS twos_series,
      array_agg(overdue_work      ORDER BY day) FILTER (WHERE day >= v_window_start) AS ow_series,

      -- Equipment and WO are cumulative metrics: delta = new-in-window vs prior.
      COALESCE(SUM(total_new) FILTER (WHERE day BETWEEN v_window_start AND v_today), 0) AS te_curr_window,
      COALESCE(SUM(total_new) FILTER (WHERE day BETWEEN v_prior_start AND v_prior_end), 0) AS te_prior_window,
      COALESCE(SUM(wo_new)    FILTER (WHERE day BETWEEN v_window_start AND v_today), 0) AS twos_curr_window,
      COALESCE(SUM(wo_new)    FILTER (WHERE day BETWEEN v_prior_start AND v_prior_end), 0) AS twos_prior_window,

      -- needs_attention and overdue are snapshot metrics: delta = avg(current) vs avg(prior).
      avg(needs_attention) FILTER (WHERE day >= v_window_start) AS na_curr_avg,
      avg(needs_attention) FILTER (WHERE day <  v_window_start) AS na_prior_avg,
      avg(overdue_work)    FILTER (WHERE day >= v_window_start) AS ow_curr_avg,
      avg(overdue_work)    FILTER (WHERE day <  v_window_start) AS ow_prior_avg
    FROM (
      SELECT
        m.*,
        COALESCE(ed.total_new, 0)::integer AS total_new,
        COALESCE(wd.total_new, 0)::integer AS wo_new
      FROM merged m
      LEFT JOIN equipment_daily_created  ed ON ed.day = m.day
      LEFT JOIN work_orders_daily_created wd ON wd.day = m.day
    ) daily
  )
  SELECT
    -- total_equipment (cumulative)
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

    -- overdue_work (snapshot)
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

    -- total_work_orders (cumulative)
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

    -- needs_attention (snapshot — point-in-time from equipment_status_history)
    na_series::integer[] AS needs_attention_series,
    CASE
      WHEN na_prior_avg IS NULL OR na_prior_avg = 0 THEN NULL
      ELSE round(((COALESCE(na_curr_avg, 0) - na_prior_avg) / na_prior_avg) * 100)::integer
    END AS needs_attention_delta,
    CASE
      WHEN na_prior_avg IS NULL OR na_prior_avg = 0 THEN 'flat'
      WHEN COALESCE(na_curr_avg, 0) > na_prior_avg THEN 'up'
      WHEN COALESCE(na_curr_avg, 0) < na_prior_avg THEN 'down'
      ELSE 'flat'
    END AS needs_attention_direction
  FROM current_agg;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_trends(uuid, integer) IS
  'Dashboard sparkline + trend data for the four StatsGrid KPIs. '
  'Single-round-trip RPC returning p_days-length series and window deltas. '
  'needs_attention is derived from equipment_status_history (point-in-time) '
  'so historical sparkline bars reflect actual status on each day rather than '
  'back-projecting current status. '
  'The overdue_events CTE relies on due_day/completed_day bounds so that '
  'completed WOs that were historically overdue are counted correctly (fix #665). '
  'WOs with status IN (completed, cancelled) AND completed_date IS NULL are '
  'excluded to avoid treating them as perpetually overdue. '
  'Team scope and admin status derived ENTIRELY server-side from auth.uid(). '
  'Tenant isolation enforced by public.is_org_member(). See issues #589, #664, #665.';

REVOKE ALL  ON FUNCTION public.get_dashboard_trends(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_trends(uuid, integer) TO authenticated;

COMMIT;
