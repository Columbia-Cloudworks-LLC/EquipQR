-- Migration: Add invoice number, environment, and PDF attachment tracking to quickbooks_export_logs
-- Description: Adds columns for invoice number display, environment detection, and PDF attachment status
-- Author: System
-- Date: 2026-01-03
--
-- These columns enable:
-- 1. Displaying the user-friendly invoice number (DocNumber) in the UI
-- 2. Constructing the correct QBO URL (sandbox vs production)
-- 3. Tracking PDF attachment success/failure separately from invoice export

-- ============================================================================
-- PART 1: Add new columns to quickbooks_export_logs
-- ============================================================================

-- Invoice number (DocNumber) for display in UI
ALTER TABLE public.quickbooks_export_logs
ADD COLUMN IF NOT EXISTS quickbooks_invoice_number TEXT;

COMMENT ON COLUMN public.quickbooks_export_logs.quickbooks_invoice_number IS 
    'The QuickBooks Invoice DocNumber (user-friendly invoice number) for display in the UI.';

-- Environment (sandbox or production) for constructing QBO URLs
ALTER TABLE public.quickbooks_export_logs
ADD COLUMN IF NOT EXISTS quickbooks_environment TEXT CHECK (quickbooks_environment IN ('sandbox', 'production'));

COMMENT ON COLUMN public.quickbooks_export_logs.quickbooks_environment IS 
    'The QuickBooks environment used for export. Used to construct correct QBO URLs (sandbox vs production).';

-- PDF attachment status tracking
ALTER TABLE public.quickbooks_export_logs
ADD COLUMN IF NOT EXISTS pdf_attachment_status TEXT CHECK (pdf_attachment_status IN ('success', 'failed', 'skipped', 'disabled'));

COMMENT ON COLUMN public.quickbooks_export_logs.pdf_attachment_status IS 
    'Status of PDF attachment: success (attached), failed (error during upload), skipped (no PDF needed), disabled (feature off).';

-- PDF attachment error message (if failed)
ALTER TABLE public.quickbooks_export_logs
ADD COLUMN IF NOT EXISTS pdf_attachment_error TEXT;

COMMENT ON COLUMN public.quickbooks_export_logs.pdf_attachment_error IS 
    'Error message if PDF attachment failed. NULL if successful or not attempted.';

-- PDF attachment intuit_tid (for troubleshooting attachment issues)
ALTER TABLE public.quickbooks_export_logs
ADD COLUMN IF NOT EXISTS pdf_attachment_intuit_tid TEXT;

COMMENT ON COLUMN public.quickbooks_export_logs.pdf_attachment_intuit_tid IS 
    'The intuit_tid from the PDF attachment API call for troubleshooting.';

-- ============================================================================
-- PART 2: Add index for invoice number lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_quickbooks_export_logs_invoice_number 
    ON public.quickbooks_export_logs(quickbooks_invoice_number)
    WHERE quickbooks_invoice_number IS NOT NULL;
