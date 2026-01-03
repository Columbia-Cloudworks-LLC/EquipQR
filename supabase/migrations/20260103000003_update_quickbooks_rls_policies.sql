-- Migration: Update QuickBooks RLS policies to use can_user_manage_quickbooks function
-- Description: Aligns RLS policies with the granular QuickBooks permission system
-- Author: System
-- Date: 2026-01-03
--
-- This migration:
-- 1. Updates RLS policies on quickbooks_team_customers to use can_user_manage_quickbooks
-- 2. Updates RLS policies on quickbooks_export_logs to use can_user_manage_quickbooks
-- 3. Adds performance index on can_manage_quickbooks column

-- ============================================================================
-- PART 1: Add performance index for QuickBooks permission lookups
-- ============================================================================

-- Index to speed up permission checks in organizations with many members
CREATE INDEX IF NOT EXISTS idx_organization_members_can_manage_qb 
    ON public.organization_members(organization_id, can_manage_quickbooks) 
    WHERE can_manage_quickbooks = true;

COMMENT ON INDEX public.idx_organization_members_can_manage_qb IS 
    'Index to optimize QuickBooks permission lookups for admins with granted access.';

-- ============================================================================
-- PART 2: Update quickbooks_team_customers RLS policies
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "quickbooks_team_customers_select_policy" ON public.quickbooks_team_customers;
DROP POLICY IF EXISTS "quickbooks_team_customers_insert_policy" ON public.quickbooks_team_customers;
DROP POLICY IF EXISTS "quickbooks_team_customers_update_policy" ON public.quickbooks_team_customers;
DROP POLICY IF EXISTS "quickbooks_team_customers_delete_policy" ON public.quickbooks_team_customers;

-- Recreate policies using can_user_manage_quickbooks function
CREATE POLICY "quickbooks_team_customers_select_policy"
ON public.quickbooks_team_customers
FOR SELECT
USING (
    public.can_user_manage_quickbooks((SELECT auth.uid()), organization_id)
);

CREATE POLICY "quickbooks_team_customers_insert_policy"
ON public.quickbooks_team_customers
FOR INSERT
WITH CHECK (
    public.can_user_manage_quickbooks((SELECT auth.uid()), organization_id)
);

CREATE POLICY "quickbooks_team_customers_update_policy"
ON public.quickbooks_team_customers
FOR UPDATE
USING (
    public.can_user_manage_quickbooks((SELECT auth.uid()), organization_id)
)
WITH CHECK (
    public.can_user_manage_quickbooks((SELECT auth.uid()), organization_id)
);

CREATE POLICY "quickbooks_team_customers_delete_policy"
ON public.quickbooks_team_customers
FOR DELETE
USING (
    public.can_user_manage_quickbooks((SELECT auth.uid()), organization_id)
);

-- ============================================================================
-- PART 3: Update quickbooks_export_logs RLS policies
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "quickbooks_export_logs_select_policy" ON public.quickbooks_export_logs;
DROP POLICY IF EXISTS "quickbooks_export_logs_insert_policy" ON public.quickbooks_export_logs;
DROP POLICY IF EXISTS "quickbooks_export_logs_update_policy" ON public.quickbooks_export_logs;

-- Recreate policies using can_user_manage_quickbooks function
CREATE POLICY "quickbooks_export_logs_select_policy"
ON public.quickbooks_export_logs
FOR SELECT
USING (
    public.can_user_manage_quickbooks((SELECT auth.uid()), organization_id)
);

-- INSERT policy: Defense-in-depth for authenticated user operations
-- NOTE: Edge functions use service_role which BYPASSES RLS entirely.
-- For service_role operations, auth.uid() returns NULL, but this is irrelevant
-- since RLS policies are not evaluated. This policy only applies to direct
-- authenticated user operations (e.g., if RLS were ever misconfigured to apply
-- to a client-side operation). Intentionally kept as additional security layer.
CREATE POLICY "quickbooks_export_logs_insert_policy"
ON public.quickbooks_export_logs
FOR INSERT
WITH CHECK (
    public.can_user_manage_quickbooks((SELECT auth.uid()), organization_id)
);

-- UPDATE policy: Defense-in-depth for authenticated user operations
-- NOTE: Same as INSERT - service_role bypasses RLS, so auth.uid() being NULL
-- for service_role is not a concern. This policy protects against any direct
-- authenticated user updates, providing an additional security layer.
CREATE POLICY "quickbooks_export_logs_update_policy"
ON public.quickbooks_export_logs
FOR UPDATE
USING (
    public.can_user_manage_quickbooks((SELECT auth.uid()), organization_id)
)
WITH CHECK (
    public.can_user_manage_quickbooks((SELECT auth.uid()), organization_id)
);
