-- Migration: Add QuickBooks team-customer mapping table
-- Description: Creates table to map EquipQR teams to QuickBooks customers for invoice export
-- Author: System
-- Date: 2025-12-02

-- ============================================================================
-- PART 1: Create quickbooks_team_customers table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quickbooks_team_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    quickbooks_customer_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Ensure each team can only have one QuickBooks customer mapping per organization
    UNIQUE(organization_id, team_id)
);

-- Add comments for documentation
COMMENT ON TABLE public.quickbooks_team_customers IS 
    'Maps EquipQR teams to QuickBooks Online customers. Used for invoice export to associate work orders with the correct QuickBooks customer.';

COMMENT ON COLUMN public.quickbooks_team_customers.quickbooks_customer_id IS 
    'The QuickBooks Customer ID (Customer.Id) from the QuickBooks API';

COMMENT ON COLUMN public.quickbooks_team_customers.display_name IS 
    'The customer display name from QuickBooks for UI display purposes';

-- ============================================================================
-- PART 2: Create indexes for performance
-- ============================================================================

-- Index on organization_id for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_quickbooks_team_customers_org 
    ON public.quickbooks_team_customers(organization_id);

-- Index on team_id for lookups
CREATE INDEX IF NOT EXISTS idx_quickbooks_team_customers_team 
    ON public.quickbooks_team_customers(team_id);

-- Index on quickbooks_customer_id for reverse lookups
CREATE INDEX IF NOT EXISTS idx_quickbooks_team_customers_qb_customer 
    ON public.quickbooks_team_customers(quickbooks_customer_id);

-- ============================================================================
-- PART 3: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.quickbooks_team_customers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: Create RLS Policies
-- ============================================================================

-- Policy: SELECT - Admin/owner of organization can view team customer mappings
CREATE POLICY "quickbooks_team_customers_select_policy" 
ON public.quickbooks_team_customers
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = (SELECT auth.uid())
        AND om.organization_id = quickbooks_team_customers.organization_id
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
);

-- Policy: INSERT - Admin/owner of organization can create mappings
CREATE POLICY "quickbooks_team_customers_insert_policy"
ON public.quickbooks_team_customers
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = (SELECT auth.uid())
        AND om.organization_id = quickbooks_team_customers.organization_id
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
);

-- Policy: UPDATE - Admin/owner of organization can update mappings
CREATE POLICY "quickbooks_team_customers_update_policy"
ON public.quickbooks_team_customers
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = (SELECT auth.uid())
        AND om.organization_id = quickbooks_team_customers.organization_id
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = (SELECT auth.uid())
        AND om.organization_id = quickbooks_team_customers.organization_id
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
);

-- Policy: DELETE - Admin/owner of organization can delete mappings
CREATE POLICY "quickbooks_team_customers_delete_policy"
ON public.quickbooks_team_customers
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = (SELECT auth.uid())
        AND om.organization_id = quickbooks_team_customers.organization_id
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
);

-- ============================================================================
-- PART 5: Create updated_at trigger
-- ============================================================================

-- Create or replace trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_quickbooks_team_customers_updated_at()
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
DROP TRIGGER IF EXISTS trigger_quickbooks_team_customers_updated_at ON public.quickbooks_team_customers;
CREATE TRIGGER trigger_quickbooks_team_customers_updated_at
    BEFORE UPDATE ON public.quickbooks_team_customers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_quickbooks_team_customers_updated_at();

-- ============================================================================
-- PART 6: Grant permissions
-- ============================================================================

-- Grant access to authenticated users (RLS will restrict actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quickbooks_team_customers TO authenticated;

-- Grant full access to service role (bypasses RLS)
GRANT ALL ON public.quickbooks_team_customers TO service_role;
