-- =============================================================================
-- Migration: Route push notifications through the pgmq queue
-- Issue: #722 (Sub-change 2 of 3)
-- Date: 2026-05-03
--
-- Replaces the producer-side body of public.broadcast_notification (originally
-- defined in 20260126040526_add_notification_broadcast.sql) so that the
-- offline/background push notification path is durable.
--
-- Before: the trigger called net.http_post('.../send-push-notification', ...)
-- as fire-and-forget. If pg_net or the Edge Function were down, the call
-- failed silently with only a RAISE WARNING (the message was lost).
--
-- After: the trigger calls pgmq_public.send('notifications', payload). The
-- queue-worker Edge Function (cron-driven, every minute) drains the queue
-- and invokes send-push-notification. Failed deliveries are not deleted from
-- the queue, so pgmq's visibility-timeout (vt) makes them eligible for
-- automatic retry.
--
-- Behavior preserved:
--   * The realtime.send block (online/connected user delivery) is UNCHANGED.
--     Real-time UX for connected clients is not affected by this migration.
--   * The outer EXCEPTION WHEN OTHERS handler is preserved. A queue failure
--     still does not block the notification insert; the row is created
--     regardless and clients see it on next page load.
--   * The COMMENT ON TRIGGER and policy on realtime.messages are unchanged.
--
-- Per the migration freeze rule (AGENTS.md), this is a NEW migration that
-- supersedes the prior CREATE OR REPLACE — the original migration file at
-- 20260126040526_add_notification_broadcast.sql is not edited in place.
--
-- See Change Record on issue #722 for the full design.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.broadcast_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- ===========================================================================
  -- PART A: Realtime broadcast (online/connected users) - UNCHANGED
  -- ===========================================================================
  -- Broadcast a lightweight signal to the user's private channel; clients
  -- refetch the full notification data on receipt to keep payloads small.
  PERFORM realtime.send(
    jsonb_build_object(
      'notification_id', NEW.id,
      'type', NEW.type,
      'title', NEW.title,
      'is_global', NEW.is_global,
      'created_at', NEW.created_at
    ),
    'new_notification',
    'notifications:user:' || NEW.user_id::text,
    true
  );

  -- ===========================================================================
  -- PART B: Push notification enqueue (offline/background users) - REWRITTEN
  -- ===========================================================================
  -- Replaces the prior fire-and-forget net.http_post call to
  -- send-push-notification with a durable enqueue into pgmq. The cron-driven
  -- queue-worker Edge Function (see 20260503140000_schedule_queue_worker.sql)
  -- drains the queue every minute and invokes send-push-notification per
  -- message. Failed deliveries are retried automatically via pgmq's vt.
  --
  -- Payload schema is identical to what the prior pg_net call sent, so
  -- send-push-notification's request handler does not need any changes.
  BEGIN
    PERFORM pgmq_public.send(
      'notifications',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'title', NEW.title,
        'body', NEW.message,
        'data', jsonb_build_object(
          'notification_id', NEW.id,
          'type', NEW.type,
          'work_order_id', NEW.data->>'work_order_id',
          'organization_id', NEW.organization_id
        ),
        'url', CASE
          WHEN NEW.data->>'work_order_id' IS NOT NULL
          THEN '/dashboard/work-orders/' || (NEW.data->>'work_order_id')
          ELSE '/dashboard/notifications'
        END
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- pgmq enqueue errors should not block the notification insert.
    -- Common causes: pgmq extension not enabled, queue not yet created.
    -- Realtime delivery (PART A) already ran, so connected clients still
    -- see the notification; offline/background users will miss this one
    -- specific event but the next event recovers automatically once pgmq
    -- is healthy. This degraded-mode behavior is intentional per the
    -- Risk & Impact Analysis on the Change Record.
    RAISE WARNING 'pgmq enqueue failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Outer guard: never block the notification insert. The notification row
  -- is what users care about; broadcast/push are best-effort.
  RAISE WARNING 'broadcast_notification failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.broadcast_notification() IS
  'Trigger function fired on AFTER INSERT ON public.notifications. '
  'Broadcasts a real-time signal via realtime.send for online users AND '
  'enqueues a durable message into the pgmq notifications queue for '
  'offline/background push delivery. The queue-worker Edge Function '
  '(cron-driven) drains the queue and invokes send-push-notification. '
  'Replaces the prior fire-and-forget net.http_post pattern with durable '
  'retry semantics. See migration 20260503150000 and Change Record on issue #722.';

-- The trigger itself (broadcast_notification_trigger ON public.notifications)
-- and the RLS policy on realtime.messages are unchanged from
-- 20260126040526_add_notification_broadcast.sql.

COMMIT;
