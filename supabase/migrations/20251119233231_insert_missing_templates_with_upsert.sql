-- NO-OP: This migration has been superseded
-- The 'Default PM Template' insert is now handled by 20251119232102_seed_global_pm_templates.sql
-- This file is kept for migration history compatibility

BEGIN;

-- Insert missing global PM templates using upsert pattern
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
  'Default PM Template',
  'Default preventative maintenance template',
  '[]'::jsonb,
  true,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."pm_checklist_templates" 
  WHERE "organization_id" IS NULL AND "name" = 'Default PM Template'
);

COMMIT;

