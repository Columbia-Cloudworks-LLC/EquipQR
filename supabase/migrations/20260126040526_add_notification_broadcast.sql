-- ============================================================================
-- Migration: Add Notification Broadcast Infrastructure
-- 
-- Purpose: Enable scalable real-time notifications using Supabase Broadcast
--          instead of postgres_changes. This approach is recommended by Supabase
--          for better scalability and security.
-- 
-- Components:
--   1. RLS policy on realtime.messages for user-scoped private channels
--   2. Trigger function to broadcast notifications on insert
--   3. Trigger on notifications table
--
-- Prerequisites:
--   - pg_net extension must be enabled (via Supabase Dashboard > Database > Extensions)
--   - Vault secrets 'supabase_url' and 'service_role_key' must be configured
--
-- Down Migration (to revert):
--   DROP TRIGGER IF EXISTS broadcast_notification_trigger ON public.notifications;
--   DROP FUNCTION IF EXISTS public.broadcast_notification();
--   DROP POLICY IF EXISTS "users_receive_own_notifications" ON "realtime"."messages";
-- ============================================================================

BEGIN;

-- =============================================================================
-- PART 1: Create RLS Policy on realtime.messages
-- =============================================================================
-- This policy ensures authenticated users can only subscribe to and receive
-- broadcasts on their own user-scoped notification channel.
-- 
-- Topic format: 'notifications:user:<user_uuid>'

-- Drop existing policy if it exists (idempotent)
DROP POLICY IF EXISTS "users_receive_own_notifications" ON "realtime"."messages";

-- Create the authorization policy for private notification channels
CREATE POLICY "users_receive_own_notifications" 
ON "realtime"."messages" 
FOR SELECT 
TO authenticated 
USING (
  realtime.topic() = 'notifications:user:' || auth.uid()::text
);

COMMENT ON POLICY "users_receive_own_notifications" ON "realtime"."messages" IS 
  'Allows authenticated users to receive broadcasts only on their own notification channel (notifications:user:<user_id>).';

-- =============================================================================
-- PART 2: Create Broadcast Trigger Function
-- =============================================================================
-- When a notification is inserted, this function broadcasts a lightweight
-- payload to the user's private channel. Clients receive this signal and
-- refetch the full notification data, keeping broadcast payloads small.

CREATE OR REPLACE FUNCTION public.broadcast_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_request_id BIGINT;
BEGIN
  -- Broadcast to user-specific private channel
  -- The payload is intentionally minimal - clients will refetch full data
  PERFORM realtime.send(
    jsonb_build_object(
      'notification_id', NEW.id,
      'type', NEW.type,
      'title', NEW.title,
      'is_global', NEW.is_global,
      'created_at', NEW.created_at
    ),
    'new_notification',                           -- event name
    'notifications:user:' || NEW.user_id::text,   -- topic (user-scoped)
    true                                          -- private channel (requires auth)
  );
  
  -- Also trigger push notification for offline/background users via pg_net
  -- This is non-blocking (async HTTP request)
  -- Uses vault secrets following established EquipQR pattern
  BEGIN
    -- Retrieve secrets from Supabase Vault (same pattern as quickbooks-refresh-tokens)
    SELECT 
      decrypted_secret INTO v_supabase_url 
    FROM vault.decrypted_secrets 
    WHERE name = 'supabase_url' 
    LIMIT 1;
    
    SELECT 
      decrypted_secret INTO v_service_role_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'service_role_key' 
    LIMIT 1;
    
    -- Only attempt push if configuration is available
    IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
      -- Basic validation of Supabase URL (defense-in-depth against SSRF)
      -- Allows: https://*.supabase.co (production) and http://localhost:* (development)
      -- Since URL comes from trusted vault, this is primarily for safety
      IF v_supabase_url !~ '^(https://[A-Za-z0-9.-]+\.supabase\.co|http://localhost(:[0-9]+)?)/?$' THEN
        RAISE WARNING 'Push notification skipped: invalid supabase_url format in vault secrets';
      ELSE
        -- Use net.http_post with timeout to prevent blocking
        SELECT net.http_post(
          url := v_supabase_url || '/functions/v1/send-push-notification',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || v_service_role_key,
            'Content-Type', 'application/json'
          ),
          body := jsonb_build_object(
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
          ),
          timeout_milliseconds := 5000  -- 5 second timeout for push request
        ) INTO v_request_id;
        
        IF v_request_id IS NULL THEN
          RAISE WARNING 'Failed to schedule push notification request';
        END IF;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- pg_net errors should not block the notification insert
    -- Common case: pg_net extension not enabled or vault secrets not configured
    RAISE WARNING 'push notification request failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the insert - notification should still be created
  -- even if broadcast fails (user can still see it on next page load)
  RAISE WARNING 'broadcast_notification failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.broadcast_notification() OWNER TO postgres;

COMMENT ON FUNCTION public.broadcast_notification() IS 
  'Trigger function that broadcasts a lightweight signal when a notification is inserted. Uses Supabase Realtime Broadcast for scalable delivery to connected clients.';

-- =============================================================================
-- PART 3: Attach Trigger to Notifications Table
-- =============================================================================
-- The trigger fires AFTER INSERT so the row exists before we broadcast.
-- Note: pg_net requests are async - by the time the Edge Function executes,
-- the transaction will typically be committed and the notification visible.

-- Drop existing trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS broadcast_notification_trigger ON public.notifications;

-- Create the trigger
CREATE TRIGGER broadcast_notification_trigger
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.broadcast_notification();

COMMENT ON TRIGGER broadcast_notification_trigger ON public.notifications IS 
  'Broadcasts a real-time signal to the target user when a notification is created.';

COMMIT;
