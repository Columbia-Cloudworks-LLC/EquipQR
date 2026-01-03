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

-- INSERT policy: Still requires permission check even though edge functions use service role
-- This provides defense-in-depth in case of misconfiguration
CREATE POLICY "quickbooks_export_logs_insert_policy"
ON public.quickbooks_export_logs
FOR INSERT
WITH CHECK (
    public.can_user_manage_quickbooks((SELECT auth.uid()), organization_id)
);

-- UPDATE policy: Same defense-in-depth approach
CREATE POLICY "quickbooks_export_logs_update_policy"
ON public.quickbooks_export_logs
FOR UPDATE
USING (
    public.can_user_manage_quickbooks((SELECT auth.uid()), organization_id)
)
WITH CHECK (
    public.can_user_manage_quickbooks((SELECT auth.uid()), organization_id)
);
