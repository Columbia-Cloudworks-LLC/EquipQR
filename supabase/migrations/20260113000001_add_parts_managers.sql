-- ============================================================================
-- Migration: Add Organization-Level Parts Managers
-- 
-- Purpose: Replace per-item inventory managers with organization-level parts
-- managers who can edit all inventory items in their organization.
-- ============================================================================

-- ============================================================================
-- PART 1: Create parts_managers table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.parts_managers (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id)
);

-- Add comment for documentation
COMMENT ON TABLE public.parts_managers IS 
  'Organization-level parts managers who can edit all inventory items in their organization. '
  'Replaces the per-item inventory_item_managers approach for better scalability.';

-- ============================================================================
-- PART 2: Create indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_parts_managers_org_id 
  ON public.parts_managers(organization_id);

CREATE INDEX IF NOT EXISTS idx_parts_managers_user_id 
  ON public.parts_managers(user_id);

-- ============================================================================
-- PART 3: Enable RLS
-- ============================================================================

ALTER TABLE public.parts_managers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: Create RLS Policies
-- ============================================================================

-- Policy: Organization members can view parts managers in their org
CREATE POLICY "parts_managers_select_policy" ON public.parts_managers
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Policy: Only owners and admins can insert parts managers
CREATE POLICY "parts_managers_insert_policy" ON public.parts_managers
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin')
    )
  );

-- Policy: Only owners and admins can delete parts managers
CREATE POLICY "parts_managers_delete_policy" ON public.parts_managers
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- PART 5: Create helper function to check if user is a parts manager
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_parts_manager(
  p_organization_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.parts_managers
    WHERE organization_id = p_organization_id
    AND user_id = p_user_id
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_parts_manager(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.is_parts_manager IS 
  'Checks if a user is a parts manager for the given organization. '
  'Defaults to checking the current authenticated user.';

-- ============================================================================
-- PART 6: Create function to check if user can manage inventory
-- ============================================================================

-- This function returns TRUE if the user is an owner, admin, or parts manager
CREATE OR REPLACE FUNCTION public.can_manage_inventory(
  p_organization_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Check organization role
  SELECT role INTO v_role
  FROM public.organization_members
  WHERE organization_id = p_organization_id
  AND user_id = p_user_id
  AND status = 'active';
  
  -- Owners and admins can always manage inventory
  IF v_role IN ('owner', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a parts manager
  RETURN public.is_parts_manager(p_organization_id, p_user_id);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.can_manage_inventory(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.can_manage_inventory IS 
  'Checks if a user can manage inventory for the given organization. '
  'Returns TRUE for owners, admins, and parts managers.';
