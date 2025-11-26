-- Insert excavator PM template
-- This migration was applied directly to production
-- Idempotent: Safe to run multiple times

BEGIN;

-- Insert excavator PM template if it doesn't exist
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
  'Excavator',
  'Preventative maintenance checklist for excavators',
  '[]'::jsonb,
  true,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."pm_checklist_templates" 
  WHERE "organization_id" IS NULL AND "name" = 'Excavator'
);

COMMIT;

