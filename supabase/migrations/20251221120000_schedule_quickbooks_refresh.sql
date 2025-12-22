-- Migration: Schedule QuickBooks Token Refresh
-- Description: Creates a pg_cron job to automatically refresh QuickBooks OAuth tokens
-- Author: System
-- Date: 2025-12-21
--
-- IMPORTANT: After running this migration, you must manually insert the service role key
-- into vault.secrets for each environment. See docs/integrations/quickbooks.md for instructions.
--
-- Required vault secrets:
--   - service_role_key: The Supabase service role key for this environment
--   - supabase_url: The Supabase project URL (e.g., https://xxxxx.supabase.co)

-- ============================================================================
-- PART 1: Enable required extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- PART 2: Create helper function to call the edge function with vault secret
-- ============================================================================

CREATE OR REPLACE FUNCTION public.invoke_quickbooks_token_refresh()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_role_key text;
  supabase_url text;
  request_id bigint;
  current_user_role text;
  is_superuser boolean;
BEGIN
  -- Authorization check: Only allow postgres superuser (pg_cron) or explicitly granted roles
  -- pg_cron executes jobs as the postgres superuser
  SELECT rolname, rolsuper
  INTO current_user_role, is_superuser
  FROM pg_roles
  WHERE oid = current_user::oid;
  
  -- Check if current user is postgres superuser (pg_cron context) or has superuser privileges
  IF current_user_role != 'postgres' AND NOT is_superuser THEN
    RAISE EXCEPTION 'Access denied: This function can only be called by pg_cron scheduler or authorized superusers';
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

  -- Call the edge function and capture request ID
  SELECT net.http_post(
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

-- Restrict access to the function (security improvement)
-- Only pg_cron scheduler (runs as postgres superuser) can execute this function
REVOKE EXECUTE ON FUNCTION public.invoke_quickbooks_token_refresh() FROM PUBLIC;

COMMENT ON FUNCTION public.invoke_quickbooks_token_refresh() IS 
  'Calls the quickbooks-refresh-tokens edge function using credentials stored in vault.secrets. '
  'This function is secured and can only be called by pg_cron scheduler (postgres superuser) '
  'or other authorized superusers. It includes internal authorization checks to prevent unauthorized access.';

-- ============================================================================
-- PART 3: Schedule the cron job
-- ============================================================================

SELECT cron.schedule(
  'refresh-quickbooks-tokens',
  '*/15 * * * *',
  $$SELECT public.invoke_quickbooks_token_refresh();$$
);

COMMENT ON EXTENSION pg_cron IS 
  'Job scheduler for PostgreSQL - used for scheduled tasks like QuickBooks token refresh';
