-- Insert missing templates with upsert
-- This migration was applied directly to production
-- Idempotent: Safe to run multiple times

BEGIN;

-- Insert missing global PM templates using upsert pattern
-- Use an existing user for created_by (avoids FK constraint issues with auth.users)
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
  -- Use first available org owner/admin, or fallback to first active user
  COALESCE(
    (SELECT user_id FROM organization_members 
     WHERE role IN ('owner', 'admin') AND status = 'active' 
     ORDER BY joined_date ASC LIMIT 1),
    (SELECT user_id FROM organization_members 
     WHERE status = 'active' 
     ORDER BY joined_date ASC LIMIT 1),
    (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1)
  ),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."pm_checklist_templates" 
  WHERE "organization_id" IS NULL AND "name" = 'Default PM Template'
);

COMMIT;

