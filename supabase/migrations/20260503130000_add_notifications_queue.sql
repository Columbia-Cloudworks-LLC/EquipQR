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

-- ============================================================================
-- PART 1: Enable pgmq extension and create the notifications queue
-- ============================================================================
-- On Supabase hosted, the canonical path is the Dashboard; this
-- CREATE EXTENSION is a defensive no-op when the extension is already present.
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create the notifications queue. pgmq.create is idempotent (does nothing if
-- the queue already exists). The queue table is pgmq.q_notifications and the
-- archive table is pgmq.a_notifications.
SELECT pgmq.create('notifications');

COMMENT ON TABLE pgmq.q_notifications IS
  'Durable queue for offline/background push notifications. '
  'Producer: public.broadcast_notification trigger (replaces the prior pg_net '
  'fire-and-forget call to send-push-notification). '
  'Consumer: supabase/functions/queue-worker (cron-driven drainer). '
  'Failed messages reappear after their visibility timeout (vt) expires for '
  'automatic retry. See Change Record on issue #722.';

-- ============================================================================
-- PART 2: pgmq_public wrapper schema (matches Supabase Dashboard convention)
-- ============================================================================
-- The bare pgmq.* functions are owner-restricted by default. The Supabase
-- Dashboard's "Enable Queues" UI sets up the pgmq_public schema as a
-- SECURITY DEFINER wrapper around pgmq.*, exposing send/read/delete with
-- permissions for authenticated and service_role. This migration creates the
-- same wrapper layer in code so:
--   * The pattern works locally (without needing Dashboard click-through)
--   * The pattern works on any Supabase project (idempotent — Dashboard-set-up
--     wrappers will be no-ops via OR REPLACE)
--   * The Edge Function and trigger can both use the canonical
--     pgmq_public.<fn>(...) call site documented in Supabase's docs
--     (https://supabase.com/docs/guides/queues)
--
-- The send/read/delete signatures match the Supabase Dashboard wrappers
-- exactly so any Supabase example or third-party code that uses
-- pgmq_public.<fn> works without modification.
CREATE SCHEMA IF NOT EXISTS pgmq_public;

-- pgmq_public.send(queue_name text, message jsonb) -> bigint (msg_id)
CREATE OR REPLACE FUNCTION pgmq_public.send(
  queue_name text,
  message jsonb,
  sleep_seconds integer DEFAULT 0
)
RETURNS SETOF bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM pgmq.send(
    queue_name => queue_name,
    msg => message,
    delay => sleep_seconds
  );
END;
$$;

-- pgmq_public.read(queue_name text, sleep_seconds int, n int) -> SETOF pgmq.message_record
-- pgmq.message_record (as of pgmq 1.5.x) is: msg_id, read_ct, enqueued_at,
-- vt, message, headers — 6 columns. The signature below mirrors that exactly.
CREATE OR REPLACE FUNCTION pgmq_public.read(
  queue_name text,
  sleep_seconds integer,
  n integer
)
RETURNS TABLE (
  msg_id bigint,
  read_ct integer,
  enqueued_at timestamp with time zone,
  vt timestamp with time zone,
  message jsonb,
  headers jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM pgmq.read(
    queue_name => queue_name,
    vt => sleep_seconds,
    qty => n
  );
END;
$$;

-- pgmq_public.delete(queue_name text, message_id bigint) -> boolean
CREATE OR REPLACE FUNCTION pgmq_public.delete(
  queue_name text,
  message_id bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result boolean;
BEGIN
  SELECT pgmq.delete(
    queue_name => queue_name,
    msg_id => message_id
  ) INTO result;
  RETURN COALESCE(result, false);
END;
$$;

-- pgmq_public.archive(queue_name text, message_id bigint) -> boolean
CREATE OR REPLACE FUNCTION pgmq_public.archive(
  queue_name text,
  message_id bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result boolean;
BEGIN
  SELECT pgmq.archive(
    queue_name => queue_name,
    msg_id => message_id
  ) INTO result;
  RETURN COALESCE(result, false);
END;
$$;

-- pgmq_public.pop(queue_name text) -> SETOF pgmq.message_record (read + delete in one call)
CREATE OR REPLACE FUNCTION pgmq_public.pop(
  queue_name text
)
RETURNS TABLE (
  msg_id bigint,
  read_ct integer,
  enqueued_at timestamp with time zone,
  vt timestamp with time zone,
  message jsonb,
  headers jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM pgmq.pop(queue_name => queue_name);
END;
$$;

-- Grant EXECUTE to the standard Supabase roles. service_role drains via the
-- Edge Function; authenticated may need to publish from app code (e.g.
-- privacy request submission, future use cases). anon is intentionally NOT
-- granted — anonymous users must not be able to enqueue messages.
GRANT USAGE ON SCHEMA pgmq_public TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq_public TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA pgmq_public
  GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;

COMMENT ON SCHEMA pgmq_public IS
  'Public-facing SECURITY DEFINER wrappers around the pgmq.* functions, '
  'mirroring the schema that Supabase Dashboard provisions when "Enable Queues" '
  'is clicked. Created here in migration so the queue pattern works in any '
  'environment (local dev, ephemeral PR branches, preview, production) without '
  'requiring a Dashboard click-through. See Change Record on issue #722.';

COMMIT;
