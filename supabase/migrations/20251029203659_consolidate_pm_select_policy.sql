-- Consolidate PM SELECT policy
-- This migration was applied directly to production
-- Idempotent: Safe to run multiple times

BEGIN;

-- Drop any existing SELECT policies to ensure clean state
DROP POLICY IF EXISTS "Users can view PM for their organization" ON "public"."preventative_maintenance";
DROP POLICY IF EXISTS "preventative_maintenance_select" ON "public"."preventative_maintenance";

-- Create consolidated SELECT policy matching INSERT/UPDATE pattern, only if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'preventative_maintenance'
      AND policyname = 'preventative_maintenance_select'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "preventative_maintenance_select" ON "public"."preventative_maintenance"
        FOR SELECT USING (
          "public"."is_org_member"((select "auth"."uid"()), "organization_id")
        );
    $policy$;
  END IF;
END
$$;

COMMIT;

