-- Insert skid steer PM template
-- This migration was applied directly to production
-- Idempotent: Safe to run multiple times

BEGIN;

-- Insert skid steer PM template if it doesn't exist
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
  'Skid Steer',
  'Preventative maintenance checklist for skid steers',
  '[]'::jsonb,
  true,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."pm_checklist_templates" 
  WHERE "organization_id" IS NULL AND "name" = 'Skid Steer'
);

COMMIT;

