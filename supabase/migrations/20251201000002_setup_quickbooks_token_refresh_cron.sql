-- Migration: Set up cron job for QuickBooks token refresh
-- Description: Configures pg_cron to periodically refresh QuickBooks OAuth tokens
-- Author: System
-- Date: 2025-12-01
--
-- IMPORTANT: This migration requires the following extensions to be enabled:
-- 1. pg_cron - For scheduling jobs (enable via Supabase Dashboard > Database > Extensions)
-- 2. pg_net - For making HTTP requests from PostgreSQL (enable via Supabase Dashboard > Database > Extensions)
--
-- If these extensions are not available, use an external cron service (e.g., Vercel Cron, 
-- GitHub Actions scheduled workflow, or a separate cron service) to call the 
-- quickbooks-refresh-tokens edge function every 10 minutes.

-- ============================================================================
-- PART 1: Enable required extensions (if not already enabled)
-- ============================================================================

-- Note: These CREATE EXTENSION statements may fail if you don't have superuser access.
-- In Supabase hosted, enable these via the Dashboard instead.

-- Uncomment if you have superuser access:
-- CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
-- CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================================
-- PART 2: Create helper function to call the edge function
-- ============================================================================

-- This function makes an HTTP POST request to the quickbooks-refresh-tokens edge function
-- It uses pg_net for async HTTP requests
CREATE OR REPLACE FUNCTION public.invoke_quickbooks_token_refresh()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  function_url TEXT;
BEGIN
  -- Get Supabase URL from environment (set via Supabase Dashboard > Database > Configuration)
  -- Note: In production, these should be stored securely
  supabase_url := current_setting('app.supabase_url', true);
  service_role_key := current_setting('app.service_role_key', true);
  
  -- If settings are not configured, log and return
  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING 'QuickBooks token refresh: Supabase URL or service role key not configured';
    RETURN;
  END IF;
  
  function_url := supabase_url || '/functions/v1/quickbooks-refresh-tokens';
  
  -- Make async HTTP request using pg_net
  -- Note: This requires pg_net extension to be enabled
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  );
  
  RAISE NOTICE 'QuickBooks token refresh triggered at %', NOW();
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail - cron jobs should be resilient
    RAISE WARNING 'QuickBooks token refresh failed: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.invoke_quickbooks_token_refresh() IS 
    'Invokes the quickbooks-refresh-tokens edge function to refresh expiring OAuth tokens. Called by pg_cron.';

-- ============================================================================
-- PART 3: Schedule the cron job (requires pg_cron extension)
-- ============================================================================

-- Schedule token refresh every 10 minutes
-- Note: This will fail if pg_cron is not enabled. In that case, use external cron.

-- First, remove any existing job with the same name
DO $$
BEGIN
  -- Check if pg_cron extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if it exists
    PERFORM cron.unschedule('quickbooks-token-refresh');
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not available or job does not exist: %', SQLERRM;
END;
$$;

-- Schedule the new job
DO $$
BEGIN
  -- Check if pg_cron extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Schedule job to run every 10 minutes
    PERFORM cron.schedule(
      'quickbooks-token-refresh',
      '*/10 * * * *',  -- Every 10 minutes
      'SELECT public.invoke_quickbooks_token_refresh()'
    );
    RAISE NOTICE 'QuickBooks token refresh cron job scheduled successfully';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Please use external cron service.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Failed to schedule cron job: %. Use external cron service instead.', SQLERRM;
END;
$$;

-- ============================================================================
-- ALTERNATIVE: External Cron Setup Instructions
-- ============================================================================

/*
If pg_cron is not available or you prefer external cron, use one of these options:

1. VERCEL CRON (if using Vercel)
   Add to vercel.json:
   {
   "crons": [{
     "path": "/api/cron/quickbooks-refresh",
     "schedule": "*/10 * * * *"
   }]
   }
   
   Create /api/cron/quickbooks-refresh.ts that calls the edge function.

2. GITHUB ACTIONS SCHEDULED WORKFLOW
   Create .github/workflows/quickbooks-token-refresh.yml:
   
   name: QuickBooks Token Refresh
   on:
     schedule:
       - cron: '*/10 * * * *'  # Every 10 minutes
   jobs:
     refresh:
       runs-on: ubuntu-latest
       steps:
         - name: Call refresh endpoint
           run: |
             curl -X POST \
               -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
               -H "Content-Type: application/json" \
               "${{ secrets.SUPABASE_URL }}/functions/v1/quickbooks-refresh-tokens"

3. SUPABASE EDGE FUNCTION SCHEDULED INVOCATION (Beta)
   Check Supabase documentation for scheduled edge function invocations.

4. MANUAL/ON-DEMAND REFRESH
   The token refresh is also called on-demand when QuickBooks API calls detect
   an expired token. This provides a fallback if cron is not configured.
*/

-- ============================================================================
-- PART 4: Create utility function to manually trigger refresh
-- ============================================================================

-- This function can be called manually to refresh all tokens
CREATE OR REPLACE FUNCTION public.refresh_quickbooks_tokens_manual()
RETURNS TABLE(
  credentials_count INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cred_count INTEGER;
BEGIN
  -- Count credentials that might need refresh
  SELECT COUNT(*) INTO cred_count
  FROM public.quickbooks_credentials
  WHERE access_token_expires_at < (NOW() + INTERVAL '15 minutes')
    AND refresh_token_expires_at > NOW();
  
  -- Trigger the refresh function
  PERFORM public.invoke_quickbooks_token_refresh();
  
  RETURN QUERY SELECT 
    cred_count,
    'Token refresh triggered for ' || cred_count || ' credentials. Check edge function logs for results.'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.refresh_quickbooks_tokens_manual() IS 
    'Manually triggers QuickBooks token refresh. Returns count of credentials that may need refresh.';
