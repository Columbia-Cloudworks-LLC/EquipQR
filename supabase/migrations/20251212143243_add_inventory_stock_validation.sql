-- ============================================================================
-- Migration: Add stock level validation to prevent overselling
-- ============================================================================
-- This migration enhances the adjust_inventory_quantity function to validate
-- stock levels before allowing negative adjustments. This prevents overselling
-- when multiple users attempt to use the same part simultaneously.
--
-- The function now:
-- 1. Uses FOR UPDATE row locking (already present) for optimistic locking
-- 2. Validates that negative adjustments don't exceed available stock
-- 3. Raises an exception if insufficient stock, preventing the adjustment
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
  
  -- Lock the inventory item row for update (optimistic locking)
  -- This prevents race conditions by ensuring only one transaction can modify
  -- the row at a time, and all transactions see the most current quantity
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
  
  -- Validate stock levels for negative adjustments (reductions)
  -- This prevents overselling when multiple users attempt to use the same part
  IF p_delta < 0 AND v_new_quantity < 0 THEN
    RAISE EXCEPTION 'Insufficient stock: requested % units, but only % available',
      ABS(p_delta), v_current_quantity;
  END IF;
  
  -- Warn if new quantity is suspiciously low (but still allow it for restocks)
  IF v_new_quantity < -1000 THEN
    RAISE WARNING 'Inventory item % for org % adjusted by user % to suspiciously low quantity: %', 
      p_item_id, v_organization_id, v_user_id, v_new_quantity;
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

