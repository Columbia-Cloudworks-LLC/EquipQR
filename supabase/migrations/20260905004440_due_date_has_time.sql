-- Existing rows stay all-day: DEFAULT false preserves today's date-only due dates.
-- Down: ALTER TABLE public.work_orders DROP COLUMN IF EXISTS due_date_has_time;
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS due_date_has_time boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.work_orders.due_date_has_time IS
  'When false, due_date is a calendar day (all-day). When true, due_date includes a local clock time.';
