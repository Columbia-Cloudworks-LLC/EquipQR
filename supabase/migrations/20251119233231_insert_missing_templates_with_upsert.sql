-- This migration was applied directly to production
-- Idempotent: Safe to run multiple times

BEGIN;

-- Ensure a system profile exists for global templates
-- This satisfies the pm_checklist_templates.created_by_fkey constraint to public.profiles(id)
INSERT INTO "public"."profiles" (
  "id",
  "email",
  "name",
  "created_at",
  "updated_at",
  "email_private"
)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'system@equipqr.local',
  'System User',
  now(),
  now(),
  true
)
ON CONFLICT ("id") DO NOTHING;

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

