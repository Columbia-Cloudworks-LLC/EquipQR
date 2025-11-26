-- Fix compressor template data
-- This migration was applied directly to production
-- Idempotent: Safe to run multiple times

BEGIN;

-- Update compressor template data if it exists
UPDATE "public"."pm_checklist_templates"
SET 
  "template_data" = '[]'::jsonb,
  "updated_at" = now()
WHERE "organization_id" IS NULL 
  AND "name" = 'Compressor'
  AND "template_data" IS NULL;

COMMIT;

