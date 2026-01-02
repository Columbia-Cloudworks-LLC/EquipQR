-- Migration: Add intuit_tid column to quickbooks_export_logs
-- Description: Captures the intuit_tid from QuickBooks API response headers for troubleshooting
-- Author: System
-- Date: 2026-01-01
--
-- The intuit_tid is a unique transaction identifier returned by Intuit in API response headers.
-- Capturing this value helps Intuit's support team quickly identify and troubleshoot issues.

-- ============================================================================
-- PART 1: Add intuit_tid column to quickbooks_export_logs
-- ============================================================================

ALTER TABLE public.quickbooks_export_logs
ADD COLUMN IF NOT EXISTS intuit_tid TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.quickbooks_export_logs.intuit_tid IS 
    'The intuit_tid from QuickBooks API response headers. Used by Intuit support for troubleshooting.';

-- ============================================================================
-- PART 2: Create index for intuit_tid lookups (optional, for support queries)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_quickbooks_export_logs_intuit_tid 
    ON public.quickbooks_export_logs(intuit_tid)
    WHERE intuit_tid IS NOT NULL;
