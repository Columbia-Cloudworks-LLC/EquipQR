-- Insert missing templates with upsert
-- This migration was applied directly to production
-- Idempotent: Safe to run multiple times

BEGIN;

-- Insert missing global PM templates using upsert pattern
INSERT INTO "public"."pm_checklist_templates" (
  "id",
  "organization_id",
  "name",
  "description",
  "template_data",
  "is_protected",
  "created_by",
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
  '00000000-0000-0000-0000-000000000000'::uuid, -- System user for global templates
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."pm_checklist_templates" 
  WHERE "organization_id" IS NULL AND "name" = 'Default PM Template'
);

COMMIT;

