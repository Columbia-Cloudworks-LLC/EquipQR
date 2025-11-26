-- Fix compressor template description
-- This migration was applied directly to production
-- Idempotent: Safe to run multiple times

BEGIN;

-- Update compressor template description if it exists
UPDATE "public"."pm_checklist_templates"
SET 
  "description" = COALESCE("description", 'Preventative maintenance checklist for compressors'),
  "updated_at" = now()
WHERE "organization_id" IS NULL 
  AND "name" = 'Compressor'
  AND ("description" IS NULL OR trim("description") = '');

COMMIT;

