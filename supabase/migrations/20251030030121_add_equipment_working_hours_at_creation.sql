-- Migration: add_equipment_working_hours_at_creation
-- Adds equipment_working_hours_at_creation column to work_orders table
-- This column tracks the equipment's working hours when the work order was created

-- Add the column if it doesn't exist (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'work_orders' 
        AND column_name = 'equipment_working_hours_at_creation'
    ) THEN
        ALTER TABLE public.work_orders 
        ADD COLUMN equipment_working_hours_at_creation numeric;
        
        COMMENT ON COLUMN public.work_orders.equipment_working_hours_at_creation IS 
            'Equipment working hours at the time this work order was created. Used as a historical KPI for maintenance scheduling and equipment usage tracking.';
    END IF;
END $$;
