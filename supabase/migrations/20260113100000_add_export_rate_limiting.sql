-- Migration: Add Export Rate Limiting Infrastructure
-- Description: Creates export_request_log table and rate limiting RPC function
-- Date: 2026-01-13

BEGIN;

-- ============================================================================
-- PART 1: Create Export Request Log Table
-- ============================================================================

-- Table to track export requests for rate limiting and audit purposes
CREATE TABLE IF NOT EXISTS public.export_request_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'rate_limited'))
);

-- Add comment
COMMENT ON TABLE public.export_request_log IS 
  'Tracks export requests for rate limiting and audit purposes. '
  'Stores user, organization, report type, row count, and status.';

-- Create indexes for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_export_log_user_time 
  ON public.export_request_log(user_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_export_log_org_time 
  ON public.export_request_log(organization_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_export_log_status 
  ON public.export_request_log(status) 
  WHERE status = 'pending';

-- ============================================================================
-- PART 2: RLS Policies for Export Request Log
-- ============================================================================

-- Enable RLS
ALTER TABLE public.export_request_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own export history
CREATE POLICY "Users can view own export history"
  ON public.export_request_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all exports for their organization
CREATE POLICY "Admins can view org export history"
  ON public.export_request_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = export_request_log.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
        AND organization_members.status = 'active'
    )
  );

-- Service role can insert/update (for edge function)
CREATE POLICY "Service role can manage export logs"
  ON public.export_request_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PART 3: RPC Function for Rate Limit Check
-- ============================================================================

-- This function checks if a user/organization has exceeded their export rate limits
-- Called by the export-report edge function before processing exports
CREATE OR REPLACE FUNCTION public.check_export_rate_limit(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_minute_count INTEGER;
  v_hour_count INTEGER;
BEGIN
  -- Check exports by this user in the last minute (max 5)
  SELECT COUNT(*) INTO v_minute_count
  FROM public.export_request_log
  WHERE user_id = p_user_id
    AND requested_at > NOW() - INTERVAL '1 minute';
  
  IF v_minute_count >= 5 THEN
    RETURN FALSE;
  END IF;
  
  -- Check exports by this organization in the last hour (max 50)
  SELECT COUNT(*) INTO v_hour_count
  FROM public.export_request_log
  WHERE organization_id = p_organization_id
    AND requested_at > NOW() - INTERVAL '1 hour';
  
  IF v_hour_count >= 50 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_export_rate_limit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_export_rate_limit(UUID, UUID) TO service_role;

-- Add function comment
COMMENT ON FUNCTION public.check_export_rate_limit IS 
  'Checks if a user/organization has exceeded export rate limits. '
  'Returns TRUE if export is allowed, FALSE if rate limited. '
  'Limits: 5 exports per user per minute, 50 exports per org per hour.';

-- ============================================================================
-- PART 4: Cleanup Function for Old Export Logs
-- ============================================================================

-- Function to clean up old export logs (retain for 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_export_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.export_request_log
  WHERE requested_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- Only service role can run cleanup
GRANT EXECUTE ON FUNCTION public.cleanup_old_export_logs() TO service_role;

COMMENT ON FUNCTION public.cleanup_old_export_logs IS 
  'Removes export log entries older than 90 days. Run periodically via cron.';

COMMIT;
