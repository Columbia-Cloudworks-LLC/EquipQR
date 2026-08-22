-- Canary (#1279): live orgs still having legacy accepted-first historical timelines
-- after the #1276 backfill should be empty. Run against production/preview with a
-- read-only role when investigating regressions.
--
-- Expected: zero rows after backfill. Any hit means a new legacy create path or
-- a missed repair — investigate before shipping timeline editor/RPC changes.
--
-- Excludes the local CURSED_HISTORICAL_FIXTURE org when present.

SELECT
  wo.organization_id,
  o.name AS organization_name,
  wo.id AS work_order_id,
  wo.title,
  wo.status,
  first_history.new_status AS first_event_status,
  first_history.reason AS first_event_reason,
  first_history.changed_at AS first_event_at
FROM public.work_orders wo
JOIN public.organizations o ON o.id = wo.organization_id
JOIN LATERAL (
  SELECT h.new_status, h.reason, h.changed_at
  FROM public.work_order_status_history h
  WHERE h.work_order_id = wo.id
  ORDER BY h.changed_at ASC, h.id ASC
  LIMIT 1
) first_history ON true
WHERE wo.is_historical = true
  AND first_history.new_status = 'accepted'
  AND first_history.reason = 'Historical work order created'
  AND wo.organization_id <> '660e8400-e29b-41d4-a716-446655440011'::uuid
ORDER BY first_history.changed_at DESC, wo.id;
