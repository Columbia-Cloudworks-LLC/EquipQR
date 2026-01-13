-- ============================================================================
-- Migration: pg_cron Job for User Departure Processing
-- 
-- Purpose: Set up a scheduled job to process user departures every 5 minutes.
-- This job denormalizes user names in historical records after users leave.
-- 
-- NOTE: pg_cron is available on Supabase Pro plans and above.
-- For development/free tier, the batch processing can be triggered manually
-- or via an Edge Function called by an external cron service.
-- ============================================================================

-- Check if pg_cron extension is available and enable it
-- This will fail gracefully on environments where pg_cron isn't available
DO $$
BEGIN
  -- Try to create the extension
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    RAISE NOTICE 'pg_cron extension enabled successfully';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron extension not available. User departure processing will need to be triggered via Edge Function.';
  END;
END $$;

-- Schedule the job if pg_cron is available
DO $outer$
BEGIN
  -- Check if pg_cron is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if it exists
    PERFORM cron.unschedule('process-user-departures');
    
    -- Schedule new job to run every 5 minutes
    PERFORM cron.schedule(
      'process-user-departures',
      '*/5 * * * *',
      'SELECT public.process_all_pending_departures()'
    );
    
    RAISE NOTICE 'pg_cron job scheduled: process-user-departures (every 5 minutes)';
  ELSE
    RAISE NOTICE 'pg_cron not available. Skipping job scheduling.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule pg_cron job: %', SQLERRM;
END $outer$;

-- ============================================================================
-- Alternative: Manual trigger function for environments without pg_cron
-- This can be called from an Edge Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_departure_processing()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow service role to call this
  IF auth.role() != 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  RETURN process_all_pending_departures();
END;
$$;

COMMENT ON FUNCTION public.trigger_departure_processing() IS 
  'Manual trigger for departure processing. Called by Edge Function cron.';

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION public.trigger_departure_processing() TO service_role;
