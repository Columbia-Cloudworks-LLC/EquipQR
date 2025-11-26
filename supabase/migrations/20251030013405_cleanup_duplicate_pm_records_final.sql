-- Add unique constraint to prevent future duplicate PM records
-- This migration replaces the previous duplicate cleanup operation

BEGIN;

ALTER TABLE "public"."preventative_maintenance"
ADD CONSTRAINT preventative_maintenance_work_order_equipment_unique
UNIQUE ("work_order_id", "equipment_id");

COMMIT;
