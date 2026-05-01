-- ============================================================================
-- Migration: Drop Per-Item Inventory Managers
-- 
-- Purpose: Remove the deprecated inventory_item_managers table now that we use
-- organization-level parts managers instead.
-- ============================================================================

-- ============================================================================
-- PART 1: Drop RLS policies first
-- ============================================================================

DROP POLICY IF EXISTS "inventory_item_managers_organization_isolation" ON public.inventory_item_managers;

-- ============================================================================
-- PART 2: Drop the inventory_item_managers table
-- ============================================================================

DROP TABLE IF EXISTS public.inventory_item_managers;

-- ============================================================================
-- PART 3: Remove default_inventory_manager_id from organizations table
-- ============================================================================

ALTER TABLE public.organizations 
  DROP COLUMN IF EXISTS default_inventory_manager_id;

-- ============================================================================
-- PART 4: Add comment explaining the change
-- ============================================================================

COMMENT ON TABLE public.parts_managers IS 
  'Organization-level parts managers who can edit all inventory items in their organization. '
  'This replaces the deprecated inventory_item_managers table (per-item approach) for better scalability. '
  'Parts managers can edit all inventory items without needing individual assignments.';
