-- Migration: Create Local Inventory System
-- Description: Creates tables and functions for organization-owned inventory management
-- Date: 2025-12-10

BEGIN;

-- ============================================================================
-- PART 1: Create Transaction Type Enum
-- ============================================================================

CREATE TYPE inventory_transaction_type AS ENUM (
  'usage',
  'restock',
  'adjustment',
  'initial',
  'work_order'
);

-- ============================================================================
-- PART 2: Create inventory_items table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  external_id TEXT,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  image_url TEXT,
  location TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  default_unit_cost NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT inventory_items_low_stock_threshold_check CHECK (low_stock_threshold >= 1),
  CONSTRAINT inventory_items_quantity_on_hand_check CHECK (quantity_on_hand >= -10000)
);

-- Indexes for inventory_items
CREATE INDEX IF NOT EXISTS idx_inventory_items_organization_id 
  ON public.inventory_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_external_id 
  ON public.inventory_items(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku 
  ON public.inventory_items(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_low_stock 
  ON public.inventory_items(organization_id, quantity_on_hand, low_stock_threshold) 
  WHERE quantity_on_hand < low_stock_threshold;

-- Unique indexes for SKU and external_id (replacing table-level constraints with WHERE clauses)
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_sku_org_unique 
  ON public.inventory_items(organization_id, sku) 
  WHERE sku IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_external_id_org_unique 
  ON public.inventory_items(organization_id, external_id) 
  WHERE external_id IS NOT NULL;

-- ============================================================================
-- PART 3: Create inventory_transactions table (Audit Log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  change_amount INTEGER NOT NULL,
  transaction_type inventory_transaction_type NOT NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for inventory_transactions
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id 
  ON public.inventory_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_organization_id 
  ON public.inventory_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_user_id 
  ON public.inventory_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_work_order_id 
  ON public.inventory_transactions(work_order_id) WHERE work_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at 
  ON public.inventory_transactions(created_at DESC);

-- ============================================================================
-- PART 4: Create equipment_part_compatibility junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.equipment_part_compatibility (
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  PRIMARY KEY (equipment_id, inventory_item_id)
);

-- Indexes for equipment_part_compatibility
CREATE INDEX IF NOT EXISTS idx_equipment_part_compatibility_equipment_id 
  ON public.equipment_part_compatibility(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_part_compatibility_inventory_item_id 
  ON public.equipment_part_compatibility(inventory_item_id);

-- ============================================================================
-- PART 5: Create inventory_item_managers table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_item_managers (
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (inventory_item_id, user_id)
);

-- Indexes for inventory_item_managers
CREATE INDEX IF NOT EXISTS idx_inventory_item_managers_item_id 
  ON public.inventory_item_managers(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item_managers_user_id 
  ON public.inventory_item_managers(user_id);

-- ============================================================================
-- PART 6: Update organizations table
-- ============================================================================

ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS default_inventory_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================================
-- PART 7: Enable RLS on all tables
-- ============================================================================

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_part_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_item_managers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 8: Create RLS Policies
-- ============================================================================

-- inventory_items policies
CREATE POLICY "inventory_items_organization_isolation" ON public.inventory_items
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

-- inventory_transactions policies
CREATE POLICY "inventory_transactions_organization_isolation" ON public.inventory_transactions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

-- equipment_part_compatibility policies
CREATE POLICY "equipment_part_compatibility_organization_isolation" ON public.equipment_part_compatibility
  FOR ALL
  USING (
    equipment_id IN (
      SELECT e.id FROM public.equipment e
      INNER JOIN public.organization_members om ON e.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- inventory_item_managers policies
CREATE POLICY "inventory_item_managers_organization_isolation" ON public.inventory_item_managers
  FOR ALL
  USING (
    inventory_item_id IN (
      SELECT id FROM public.inventory_items
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
        AND status = 'active'
      )
    )
  );

-- ============================================================================
-- PART 9: Create RPC Function for Safe Quantity Adjustment
-- ============================================================================

CREATE OR REPLACE FUNCTION public.adjust_inventory_quantity(
  p_item_id UUID,
  p_delta INTEGER,
  p_reason TEXT,
  p_work_order_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_quantity INTEGER;
  v_new_quantity INTEGER;
  v_organization_id UUID;
  v_transaction_type inventory_transaction_type;
  v_user_id UUID;
BEGIN
  -- Get the current user's ID from auth context
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Validate that delta is non-zero (zero adjustments are not meaningful)
  IF p_delta = 0 THEN
    RAISE EXCEPTION 'Inventory adjustment delta cannot be zero';
  END IF;
  
  -- Lock the inventory item row for update
  SELECT quantity_on_hand, organization_id
  INTO v_current_quantity, v_organization_id
  FROM public.inventory_items
  WHERE id = p_item_id
  FOR UPDATE;
  
  -- Check if item exists
  IF v_current_quantity IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found: %', p_item_id;
  END IF;
  
  -- Verify user has access to this organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = v_user_id
    AND organization_id = v_organization_id
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'User does not have access to this organization';
  END IF;
  
  -- Calculate new quantity
  v_new_quantity := v_current_quantity + p_delta;

  -- Warn if new quantity is suspiciously low
  IF v_new_quantity < -1000 THEN
    RAISE WARNING 'Inventory item % for org % adjusted by user % to suspiciously low quantity: %', p_item_id, v_organization_id, v_user_id, v_new_quantity;
  END IF;
  
  -- Determine transaction type
  IF p_work_order_id IS NOT NULL THEN
    v_transaction_type := 'work_order';
  ELSIF p_delta < 0 THEN
    v_transaction_type := 'usage';
  ELSIF p_delta > 0 THEN
    -- p_delta > 0 (already validated that delta != 0)
    v_transaction_type := 'restock';
  END IF;
  
  -- Update inventory quantity
  UPDATE public.inventory_items
  SET 
    quantity_on_hand = v_new_quantity,
    updated_at = NOW()
  WHERE id = p_item_id;
  
  -- Insert transaction record
  INSERT INTO public.inventory_transactions (
    inventory_item_id,
    organization_id,
    user_id,
    previous_quantity,
    new_quantity,
    change_amount,
    transaction_type,
    work_order_id,
    notes
  ) VALUES (
    p_item_id,
    v_organization_id,
    v_user_id,
    v_current_quantity,
    v_new_quantity,
    p_delta,
    v_transaction_type,
    p_work_order_id,
    p_reason
  );
  
  -- Return new quantity
  RETURN v_new_quantity;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.adjust_inventory_quantity(UUID, INTEGER, TEXT, UUID) TO authenticated;

-- ============================================================================
-- PART 10: Create updated_at trigger function (if not exists)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger for inventory_items
DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON public.inventory_items;
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;

