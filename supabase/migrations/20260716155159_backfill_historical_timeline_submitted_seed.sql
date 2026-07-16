-- Issue #1276: Legacy historical creates stored only `accepted` (or another status)
-- as the first work_order_status_history row. Timeline editor and replace RPC require
-- a leading `submitted` event.

WITH affected AS (
  SELECT
    wo.id AS work_order_id,
    wo.created_by,
    CASE
      WHEN LEAST(
        COALESCE(wo.historical_start_date, wo.created_date, first_history.changed_at),
        first_history.changed_at
      ) = first_history.changed_at
      THEN first_history.changed_at - interval '1 millisecond'
      ELSE LEAST(
        COALESCE(wo.historical_start_date, wo.created_date, first_history.changed_at),
        first_history.changed_at
      )
    END AS submitted_at,
    first_history.id AS first_history_id
  FROM public.work_orders wo
  JOIN LATERAL (
    SELECT h.id, h.changed_at, h.new_status
    FROM public.work_order_status_history h
    WHERE h.work_order_id = wo.id
    ORDER BY h.changed_at ASC, h.id ASC
    LIMIT 1
  ) first_history ON true
  WHERE wo.is_historical = true
    AND first_history.new_status <> 'submitted'
),
inserted AS (
  INSERT INTO public.work_order_status_history (
    work_order_id,
    old_status,
    new_status,
    changed_by,
    changed_at,
    reason,
    metadata,
    is_historical_creation
  )
  SELECT
    affected.work_order_id,
    NULL,
    'submitted'::public.work_order_status,
    affected.created_by,
    affected.submitted_at,
    'Historical status recorded',
    jsonb_build_object('backfill', 'issue_1276_submitted_seed'),
    false
  FROM affected
  RETURNING work_order_id, id
)
UPDATE public.work_order_status_history AS h
SET old_status = 'submitted'::public.work_order_status
FROM affected
WHERE h.id = affected.first_history_id
  AND h.old_status IS NULL;
