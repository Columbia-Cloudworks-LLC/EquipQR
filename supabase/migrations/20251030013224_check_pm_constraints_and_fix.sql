-- Check PM constraints and fix
-- This migration was applied directly to production
-- Idempotent: Safe to run multiple times

BEGIN;

-- Ensure unique constraints exist (idempotent)
DO $$
BEGIN
  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'preventative_maintenance_work_order_equipment_unique'
  ) THEN
    ALTER TABLE "public"."preventative_maintenance"
    ADD CONSTRAINT "preventative_maintenance_work_order_equipment_unique"
    UNIQUE ("work_order_id", "equipment_id");
  END IF;
END $$;

COMMIT;

