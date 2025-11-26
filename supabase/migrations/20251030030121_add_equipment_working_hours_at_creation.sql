-- Add equipment working hours at creation
-- This migration was applied directly to production
-- Idempotent: Safe to run multiple times

BEGIN;

-- Add working_hours column if it doesn't exist
ALTER TABLE "public"."equipment" 
ADD COLUMN IF NOT EXISTS "working_hours" numeric DEFAULT 0;

-- Add comment
COMMENT ON COLUMN "public"."equipment"."working_hours" IS 'Total working hours for the equipment, set at creation and updated during maintenance';

COMMIT;

