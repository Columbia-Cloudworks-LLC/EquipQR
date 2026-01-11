-- Migration: Add inventory_item_id to work_order_costs
-- Description: Links cost items to their source inventory items for inventory restoration on delete/edit
-- Date: 2026-01-11

BEGIN;

-- ============================================================================
-- PART 1: Add inventory_item_id column
-- ============================================================================

-- Add nullable column to track which inventory item a cost came from
-- NULL means the cost was manually entered (not from inventory)
ALTER TABLE public.work_order_costs
  ADD COLUMN IF NOT EXISTS inventory_item_id UUID;

-- Add foreign key constraint with ON DELETE SET NULL
-- This preserves cost records even if the inventory item is deleted
ALTER TABLE public.work_order_costs
  ADD CONSTRAINT work_order_costs_inventory_item_id_fkey
  FOREIGN KEY (inventory_item_id)
  REFERENCES public.inventory_items(id)
  ON DELETE SET NULL;

-- ============================================================================
-- PART 2: Add index for query performance
-- ============================================================================

-- Index for efficiently finding costs by inventory item
-- Useful for checking if an inventory item is used in any work orders
CREATE INDEX IF NOT EXISTS idx_work_order_costs_inventory_item_id
  ON public.work_order_costs(inventory_item_id)
  WHERE inventory_item_id IS NOT NULL;

-- ============================================================================
-- PART 3: Add original_quantity column for tracking changes
-- ============================================================================

-- Track the original quantity when cost was created from inventory
-- This helps with calculating inventory adjustments when quantity changes
ALTER TABLE public.work_order_costs
  ADD COLUMN IF NOT EXISTS original_quantity numeric(10,2);

-- Add comment for documentation
COMMENT ON COLUMN public.work_order_costs.inventory_item_id IS 
  'References the source inventory item. NULL if cost was manually entered. '
  'Used to restore inventory when cost is deleted or quantity changes.';

COMMENT ON COLUMN public.work_order_costs.original_quantity IS 
  'Original quantity when cost was created from inventory. '
  'Used to calculate inventory delta when quantity is modified.';

COMMIT;
