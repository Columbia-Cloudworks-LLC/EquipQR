-- Cleanup duplicate PM records (final version)
-- This migration was applied directly to production
-- Idempotent: Safe to run multiple times

BEGIN;

-- Remove duplicates, keeping the oldest record
DELETE FROM "public"."preventative_maintenance" pm1
USING "public"."preventative_maintenance" pm2
WHERE pm1.id > pm2.id
  AND pm1.work_order_id = pm2.work_order_id
  AND pm1.equipment_id = pm2.equipment_id;

COMMIT;

