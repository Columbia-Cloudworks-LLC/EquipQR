-- Insert missing templates with upsert
-- This migration was applied directly to production
-- Idempotent: Safe to run multiple times

BEGIN;

-- Create a helper function to get a system user for migrations
-- Uses SECURITY DEFINER to bypass RLS when querying organization_members and profiles
CREATE OR REPLACE FUNCTION "public"."get_system_user_id"() 
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET "search_path" TO 'public'
SET "row_security" TO 'off'
AS $$
DECLARE
  user_id_result uuid;
BEGIN
  -- Try to get an org owner/admin first
  SELECT user_id INTO user_id_result
  FROM organization_members
  WHERE role IN ('owner', 'admin') AND status = 'active'
  ORDER BY joined_date ASC
  LIMIT 1;
  
  -- If no owner/admin, try any active org member
  IF user_id_result IS NULL THEN
    SELECT user_id INTO user_id_result
    FROM organization_members
    WHERE status = 'active'
    ORDER BY joined_date ASC
    LIMIT 1;
  END IF;
  
  -- If still no user, try any profile
  IF user_id_result IS NULL THEN
    SELECT id INTO user_id_result
    FROM profiles
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  RETURN user_id_result;
END;
$$;

-- Insert missing global PM templates using upsert pattern
-- Use the helper function to get a valid user_id (bypasses RLS)
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
  "public"."get_system_user_id"(), -- Use helper function to bypass RLS
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."pm_checklist_templates" 
  WHERE "organization_id" IS NULL AND "name" = 'Default PM Template'
)
AND "public"."get_system_user_id"() IS NOT NULL; -- Only insert if a user exists

COMMIT;

