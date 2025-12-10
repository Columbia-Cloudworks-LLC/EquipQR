-- Migration: Add QuickBooks export logs table
-- Description: Creates table to track work order exports to QuickBooks invoices
-- Author: System
-- Date: 2025-12-02

-- ============================================================================
-- PART 1: Create quickbooks_export_logs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quickbooks_export_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
    realm_id TEXT NOT NULL,
    quickbooks_invoice_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),
    error_message TEXT,
    exported_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comments for documentation
COMMENT ON TABLE public.quickbooks_export_logs IS 
    'Tracks exports of work orders to QuickBooks Online as invoices. Records both successful exports and failures for debugging.';

COMMENT ON COLUMN public.quickbooks_export_logs.realm_id IS 
    'The QuickBooks company ID (realmId) the invoice was exported to';

COMMENT ON COLUMN public.quickbooks_export_logs.quickbooks_invoice_id IS 
    'The QuickBooks Invoice ID if successfully created/updated. NULL if export failed.';

COMMENT ON COLUMN public.quickbooks_export_logs.status IS 
    'Export status: success (invoice created/updated), error (export failed), pending (in progress)';

COMMENT ON COLUMN public.quickbooks_export_logs.error_message IS 
    'Error details if export failed. NULL on success.';

COMMENT ON COLUMN public.quickbooks_export_logs.exported_at IS 
    'Timestamp when the invoice was successfully exported. NULL if pending or failed.';

-- ============================================================================
-- PART 2: Create indexes for performance
-- ============================================================================

-- Index on organization_id for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_quickbooks_export_logs_org 
    ON public.quickbooks_export_logs(organization_id);

-- Index on work_order_id for lookups
CREATE INDEX IF NOT EXISTS idx_quickbooks_export_logs_work_order 
    ON public.quickbooks_export_logs(work_order_id);

-- Index on realm_id for QuickBooks company lookups
CREATE INDEX IF NOT EXISTS idx_quickbooks_export_logs_realm 
    ON public.quickbooks_export_logs(realm_id);

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS idx_quickbooks_export_logs_status 
    ON public.quickbooks_export_logs(status);

-- Composite index for finding latest export per work order
CREATE INDEX IF NOT EXISTS idx_quickbooks_export_logs_work_order_created 
    ON public.quickbooks_export_logs(work_order_id, created_at DESC);

-- ============================================================================
-- PART 3: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.quickbooks_export_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: Create RLS Policies
-- ============================================================================

-- Policy: SELECT - Admin/owner of organization can view export logs
CREATE POLICY "quickbooks_export_logs_select_policy" 
ON public.quickbooks_export_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = (SELECT auth.uid())
        AND om.organization_id = quickbooks_export_logs.organization_id
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
);

-- Policy: INSERT - Service role only (via edge functions)
-- Authenticated users cannot directly insert logs
-- Defense-in-depth: RLS check ensures org membership even if insert granted
CREATE POLICY "quickbooks_export_logs_insert_policy"
ON public.quickbooks_export_logs
FOR INSERT
WITH CHECK (
    -- Only service role should insert, but add org check for defense-in-depth
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = (SELECT auth.uid())
        AND om.organization_id = quickbooks_export_logs.organization_id
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
);

-- Policy: UPDATE - Service role only (via edge functions)
-- Used to update status after export completes
CREATE POLICY "quickbooks_export_logs_update_policy"
ON public.quickbooks_export_logs
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = (SELECT auth.uid())
        AND om.organization_id = quickbooks_export_logs.organization_id
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = (SELECT auth.uid())
        AND om.organization_id = quickbooks_export_logs.organization_id
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
);

-- No DELETE policy - export logs are audit records and should not be deleted
-- Service role can still delete if needed for cleanup

-- ============================================================================
-- PART 5: Create updated_at trigger
-- ============================================================================

-- Create or replace trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_quickbooks_export_logs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_quickbooks_export_logs_updated_at ON public.quickbooks_export_logs;
CREATE TRIGGER trigger_quickbooks_export_logs_updated_at
    BEFORE UPDATE ON public.quickbooks_export_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_quickbooks_export_logs_updated_at();

-- ============================================================================
-- PART 6: Grant permissions
-- ============================================================================

-- Grant SELECT to authenticated users (RLS will restrict actual access to admins/owners)
GRANT SELECT ON public.quickbooks_export_logs TO authenticated;

-- Grant full access to service role (bypasses RLS) - used by edge functions
GRANT ALL ON public.quickbooks_export_logs TO service_role;
