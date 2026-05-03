-- =============================================================================
-- Migration: Enable pgmq extension and create the notifications queue
-- Issue: #722 (Sub-change 2 of 3)
-- Date: 2026-05-03
--
-- Part of the Change Record bundle on issue #722. This migration sets up the
-- producer side of the durable push-notification pipeline:
--
--   * Producer: public.broadcast_notification trigger (rewritten in migration
--     20260503150000_route_push_notifications_through_queue.sql) calls
--     pgmq_public.send('notifications', payload) instead of fire-and-forget
--     net.http_post(...).
--   * Consumer: supabase/functions/queue-worker/index.ts is a cron-triggered
--     Edge Function that drains the queue, invokes send-push-notification, and
--     deletes successfully-processed messages. The cron schedule is created in
--     migration 20260503140000_schedule_queue_worker.sql.
--
-- Vendor-side prerequisite (External Setup Procedures Section A on the Change
-- Record): the pgmq extension must be enabled via the Supabase Dashboard
-- (Database > Queues, OR Database > Extensions > pgmq > toggle ON) on the
-- target project before this migration applies. The CREATE EXTENSION below is
-- a defensive idempotent guard but may require superuser privileges that the
-- Supabase migration runner does not always have on hosted projects.
--
-- See: https://supabase.com/docs/guides/queues
-- =============================================================================

BEGIN;

-- Enable pgmq if it is not already installed. On Supabase hosted, the canonical
-- path is the Dashboard; this CREATE EXTENSION is a defensive no-op when the
-- extension is already present.
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create the notifications queue. pgmq.create is idempotent (does nothing if
-- the queue already exists). The queue table is pgmq.q_notifications and the
-- archive table is pgmq.a_notifications. Standard read/send/delete RPCs are
-- exposed in the pgmq_public schema.
SELECT pgmq.create('notifications');

COMMENT ON TABLE pgmq.q_notifications IS
  'Durable queue for offline/background push notifications. '
  'Producer: public.broadcast_notification trigger (replaces the prior pg_net '
  'fire-and-forget call to send-push-notification). '
  'Consumer: supabase/functions/queue-worker (cron-driven drainer). '
  'Failed messages reappear after their visibility timeout (vt) expires for '
  'automatic retry. See Change Record on issue #722.';

COMMIT;
