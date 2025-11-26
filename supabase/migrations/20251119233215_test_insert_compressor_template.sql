-- Canonical migration for Compressor PM template
-- This migration was applied directly to production
-- Idempotent: Safe to run multiple times
-- Note: This is the authoritative source for the Compressor template.
-- Later duplicate (20251119233511_insert_compressor_pm_template.sql) has been converted to no-op.

BEGIN;

-- Insert compressor PM template if it doesn't exist
INSERT INTO "public"."pm_checklist_templates" (
  "id",
  "organization_id",
  "name",
  "description",
  "template_data",
  "is_protected",
  "created_at",
  "updated_at"
)
SELECT 
  gen_random_uuid(),
  NULL, -- Global template
  'Compressor',
  'Preventative maintenance checklist for compressors',
  '[]'::jsonb,
  true,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."pm_checklist_templates" 
  WHERE "organization_id" IS NULL AND "name" = 'Compressor'
);

COMMIT;

