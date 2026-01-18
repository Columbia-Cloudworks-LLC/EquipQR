-- Migration: fix_pm_select_policy
-- Originally created consolidated SELECT policy for preventative_maintenance table to fix 406 errors
-- This migration was already applied to production
-- This is a placeholder file to sync local migrations with remote database
-- DO NOT modify this file - it exists only to match production state
--
-- What was actually applied to production:
-- 1. Dropped existing SELECT policies:
--    - DROP POLICY IF EXISTS "Users can view PM for their organization" ON "public"."preventative_maintenance";
--    - DROP POLICY IF EXISTS "preventative_maintenance_select" ON "public"."preventative_maintenance";
-- 2. Created consolidated SELECT policy:
--    CREATE POLICY "preventative_maintenance_select" ON "public"."preventative_maintenance" 
--      FOR SELECT USING (
--        "public"."is_org_member"((select "auth"."uid"()), "organization_id")
--      );
-- This consolidated policy replaced multiple permissive policies with a single policy using the
-- is_org_member function, matching the pattern used in INSERT/UPDATE policies and fixing 406 errors
-- that occurred when querying the preventative_maintenance table.

BEGIN;
-- Migration already applied - no-op
COMMIT;

