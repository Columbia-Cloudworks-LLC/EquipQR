-- ============================================================================
-- Migration: Move pg_net Extension to Extensions Schema
-- 
-- Purpose: Fixes Supabase Security Advisor warning (lint 0014) by moving
--          pg_net extension from public schema to extensions schema.
-- 
-- Security Rationale:
--   Extensions in the public schema can expose functions and objects that
--   shouldn't be publicly accessible. Best practice is to install extensions
--   in a dedicated schema (extensions) to limit exposure.
--
-- Impact:
--   - Any pending HTTP requests in net.http_request_queue will be lost
--   - This is acceptable for a security fix
--   - Functions using net.http_post() will continue to work as extensions
--     schema is in the default search_path
--
-- Down Migration (to revert):
--   DROP EXTENSION IF EXISTS pg_net;
--   CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;
-- ============================================================================

BEGIN;

-- =============================================================================
-- PART 1: Move pg_net from public to extensions schema
-- =============================================================================
-- This requires dropping and recreating the extension since PostgreSQL doesn't
-- support moving extensions between schemas directly.

DO $$
BEGIN
  -- Check if pg_net exists in public schema
  IF EXISTS (
    SELECT 1 
    FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'pg_net' 
      AND n.nspname = 'public'
  ) THEN
    -- Drop the extension from public schema
    -- This will also drop any dependent objects (like net.http_request_queue)
    DROP EXTENSION IF EXISTS pg_net CASCADE;
    
    -- Recreate in extensions schema
    -- The extensions schema should already exist in Supabase
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
    
    RAISE NOTICE 'pg_net extension moved from public to extensions schema';
  ELSIF EXISTS (
    SELECT 1 
    FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'pg_net' 
      AND n.nspname = 'extensions'
  ) THEN
    -- Already in the correct schema
    RAISE NOTICE 'pg_net extension is already in extensions schema';
  ELSE
    -- Extension doesn't exist, create it in extensions schema
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
    RAISE NOTICE 'pg_net extension created in extensions schema';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If we can't move it (e.g., extension is in use), log a warning
    -- but don't fail the migration - this can be fixed manually via Dashboard
    RAISE WARNING 'Could not move pg_net extension: % (SQLSTATE: %). Please move it manually via Supabase Dashboard > Database > Extensions.', SQLERRM, SQLSTATE;
END
$$;

-- =============================================================================
-- PART 2: Verify extension is in correct schema
-- =============================================================================

DO $$
DECLARE
  v_schema_name TEXT;
BEGIN
  SELECT n.nspname INTO v_schema_name
  FROM pg_extension e
  JOIN pg_namespace n ON e.extnamespace = n.oid
  WHERE e.extname = 'pg_net';
  
  IF v_schema_name IS NULL THEN
    RAISE WARNING 'pg_net extension not found. Please enable it via Supabase Dashboard > Database > Extensions.';
  ELSIF v_schema_name != 'extensions' THEN
    RAISE WARNING 'pg_net extension is in % schema, not extensions schema. Please move it manually via Supabase Dashboard > Database > Extensions.', v_schema_name;
  ELSE
    RAISE NOTICE 'pg_net extension verified in extensions schema';
  END IF;
END
$$;

COMMENT ON EXTENSION pg_net IS 
  'HTTP client extension for PostgreSQL. Used for async HTTP requests from database functions (e.g., QuickBooks token refresh, push notifications).';

-- =============================================================================
-- PART 3: Update functions to use fully qualified schema name
-- =============================================================================
-- Functions with SET search_path = '' need fully qualified names to access
-- extensions.net.http_post() after the extension is moved to extensions schema.

-- Update invoke_quickbooks_token_refresh() to use extensions.net.http_post()
CREATE OR REPLACE FUNCTION public.invoke_quickbooks_token_refresh()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  service_role_key text;
  supabase_url text;
  request_id bigint;
  current_user_role text;
  cron_job_id text;
BEGIN
  -- Authorization check: Only allow postgres superuser in pg_cron context
  -- pg_cron executes jobs as the postgres superuser and sets cron.job_id
  SELECT rolname
  INTO current_user_role
  FROM pg_roles
  WHERE oid = current_user::oid;

  -- Detect pg_cron context via cron.job_id (NULL when not running under pg_cron)
  cron_job_id := current_setting('cron.job_id', true);

  -- Check that the caller is postgres and that this is running inside a pg_cron job
  IF current_user_role != 'postgres' OR cron_job_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: This function can only be called by the pg_cron scheduler as postgres';
  END IF;

  -- Retrieve the service role key from vault
  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  -- Retrieve the Supabase URL from vault
  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_url'
  LIMIT 1;

  IF service_role_key IS NULL OR supabase_url IS NULL THEN
    RAISE WARNING 'QuickBooks token refresh skipped: vault secrets not configured';
    RETURN;
  END IF;

  -- Basic validation of Supabase URL from vault (defense-in-depth)
  -- Ensure it is an https Supabase project URL to avoid SSRF/misconfiguration issues
  IF supabase_url !~ '^https://[A-Za-z0-9.-]+\.supabase\.co/?$' THEN
    RAISE WARNING 'QuickBooks token refresh skipped: invalid supabase_url format in vault secrets';
    RETURN;
  END IF;
  -- Call the edge function and capture request ID
  -- Use fully qualified name: extensions.net.http_post()
  SELECT extensions.net.http_post(
    url := supabase_url || '/functions/v1/quickbooks-refresh-tokens',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    )
  ) INTO request_id;

  -- Verify request was scheduled
  IF request_id IS NULL THEN
    RAISE WARNING 'Failed to schedule QuickBooks token refresh request';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.invoke_quickbooks_token_refresh() IS 
  'Calls the quickbooks-refresh-tokens edge function using credentials stored in vault.secrets. '
  'This function is secured and can only be called by pg_cron scheduler (postgres superuser) '
  'or other authorized superusers. Updated to use extensions.net.http_post() after moving pg_net to extensions schema.';

-- Update broadcast_notification() to use extensions.net.http_post()
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
        -- Use extensions.net.http_post with timeout to prevent blocking
        -- Use fully qualified name: extensions.net.http_post()
        SELECT extensions.net.http_post(
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

COMMENT ON FUNCTION public.broadcast_notification() IS 
  'Trigger function that broadcasts a lightweight signal when a notification is inserted. Uses Supabase Realtime Broadcast for scalable delivery to connected clients. Updated to use extensions.net.http_post() after moving pg_net to extensions schema.';

COMMIT;
