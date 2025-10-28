-- Migration: Add multi-equipment support for work orders
-- Description: Creates join table for many-to-many relationship between work orders and equipment
-- Author: System
-- Date: 2025-10-27

-- ============================================================================
-- PART 1: Create work_order_equipment join table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.work_order_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Ensure each equipment can only be linked once per work order
    UNIQUE(work_order_id, equipment_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_order_equipment_wo 
    ON public.work_order_equipment(work_order_id);

CREATE INDEX IF NOT EXISTS idx_work_order_equipment_eq 
    ON public.work_order_equipment(equipment_id);

CREATE INDEX IF NOT EXISTS idx_work_order_equipment_primary 
    ON public.work_order_equipment(work_order_id, is_primary) 
    WHERE is_primary = true;

-- Add comment for table
COMMENT ON TABLE public.work_order_equipment IS 
    'Junction table for many-to-many relationship between work orders and equipment. Supports multi-equipment work orders.';

COMMENT ON COLUMN public.work_order_equipment.is_primary IS 
    'Indicates the primary equipment for this work order. Used for backward compatibility and UI defaults.';

-- ============================================================================
-- PART 2: Backfill existing work orders into join table
-- ============================================================================

-- Populate join table from existing work_orders.equipment_id
-- All existing work orders have their equipment marked as primary
INSERT INTO public.work_order_equipment (work_order_id, equipment_id, is_primary, created_at)
SELECT 
    id AS work_order_id,
    equipment_id,
    true AS is_primary,
    created_date AS created_at
FROM public.work_orders
WHERE equipment_id IS NOT NULL
ON CONFLICT (work_order_id, equipment_id) DO NOTHING;

-- ============================================================================
-- PART 3: Add deprecation comment to work_orders.equipment_id
-- ============================================================================

COMMENT ON COLUMN public.work_orders.equipment_id IS 
    'DEPRECATED: Use work_order_equipment join table for equipment associations. This column is maintained for backward compatibility and contains the primary equipment ID. Will be kept in sync via trigger.';

-- ============================================================================
-- PART 4: Create trigger to keep equipment_id in sync with primary equipment
-- ============================================================================

-- Function to sync primary equipment to work_orders.equipment_id
CREATE OR REPLACE FUNCTION public.sync_work_order_primary_equipment()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new primary equipment is set or updated
    IF NEW.is_primary THEN
        -- First, unset any other primary equipment for this work order
        UPDATE public.work_order_equipment 
        SET is_primary = false 
        WHERE work_order_id = NEW.work_order_id 
          AND id != NEW.id 
          AND is_primary = true;
        
        -- Update the work_orders table with the new primary equipment
        UPDATE public.work_orders 
        SET equipment_id = NEW.equipment_id 
        WHERE id = NEW.work_order_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to maintain sync
DROP TRIGGER IF EXISTS trigger_sync_primary_equipment ON public.work_order_equipment;
CREATE TRIGGER trigger_sync_primary_equipment
    AFTER INSERT OR UPDATE OF is_primary ON public.work_order_equipment
    FOR EACH ROW
    WHEN (NEW.is_primary = true)
    EXECUTE FUNCTION public.sync_work_order_primary_equipment();

-- ============================================================================
-- PART 5: Enable RLS on work_order_equipment
-- ============================================================================

ALTER TABLE public.work_order_equipment ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view work order equipment for their organization
CREATE POLICY "work_order_equipment_select_policy" ON public.work_order_equipment
    FOR SELECT
    USING (
        work_order_id IN (
            SELECT id FROM public.work_orders 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM public.organization_members 
                WHERE user_id = auth.uid() 
                  AND status = 'active'
            )
        )
    );

-- Policy: Users can insert work order equipment for work orders they can access
CREATE POLICY "work_order_equipment_insert_policy" ON public.work_order_equipment
    FOR INSERT
    WITH CHECK (
        work_order_id IN (
            SELECT id FROM public.work_orders 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM public.organization_members 
                WHERE user_id = auth.uid() 
                  AND status = 'active'
            )
        )
    );

-- Policy: Users can update work order equipment for work orders they can access
CREATE POLICY "work_order_equipment_update_policy" ON public.work_order_equipment
    FOR UPDATE
    USING (
        work_order_id IN (
            SELECT id FROM public.work_orders 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM public.organization_members 
                WHERE user_id = auth.uid() 
                  AND status = 'active'
            )
        )
    );

-- Policy: Users can delete work order equipment for work orders they can access
CREATE POLICY "work_order_equipment_delete_policy" ON public.work_order_equipment
    FOR DELETE
    USING (
        work_order_id IN (
            SELECT id FROM public.work_orders 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM public.organization_members 
                WHERE user_id = auth.uid() 
                  AND status = 'active'
            )
        )
    );

-- ============================================================================
-- PART 6: Validation queries (commented out - for manual verification)
-- ============================================================================

-- Verify all existing work orders have entries in join table:
-- SELECT COUNT(*) FROM work_orders WHERE equipment_id IS NOT NULL;
-- SELECT COUNT(*) FROM work_order_equipment WHERE is_primary = true;
-- These counts should match

-- Verify primary equipment matches legacy equipment_id:
-- SELECT wo.id, wo.equipment_id, woe.equipment_id as join_equipment_id
-- FROM work_orders wo
-- LEFT JOIN work_order_equipment woe ON wo.id = woe.work_order_id AND woe.is_primary = true
-- WHERE wo.equipment_id IS NOT NULL AND wo.equipment_id != woe.equipment_id;
-- This should return 0 rows

-- ============================================================================
-- Migration complete
-- ============================================================================

