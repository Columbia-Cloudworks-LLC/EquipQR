-- Insert scissor lift PM template (fixed)
-- This migration was applied directly to production
-- Idempotent: Safe to run multiple times

BEGIN;

-- Insert scissor lift PM template if it doesn't exist
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
  'Scissor Lift',
  'Preventative maintenance checklist for scissor lifts',
  '[]'::jsonb,
  true,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."pm_checklist_templates" 
  WHERE "organization_id" IS NULL AND "name" = 'Scissor Lift'
);

COMMIT;

